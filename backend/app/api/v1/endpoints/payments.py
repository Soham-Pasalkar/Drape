"""
DRAPE Payment Endpoints.

Handles Razorpay payment order generation, strict HMAC-SHA256 signature verification,
atomic inventory deduction upon payment confirmation, and idempotent webhook processing.
Conforms to ADR-001, ADR-002, and SYSTEM_ARCHITECTURE.md §4.
"""

import contextlib
from datetime import datetime, timezone
from decimal import Decimal
import json
import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_db,
    get_identity_adapter,
    get_payment_gateway,
)
from app.api.v1.endpoints.cart import get_variant_lock
from app.api.v1.schemas.payment import (
    PaymentVerificationResponse,
    RazorpayCreateOrderRequest,
    RazorpayCreateOrderResponse,
    RazorpayVerifyPaymentRequest,
)
from app.core.config import settings
from app.domain.models.cart import Cart, CartItem
from app.domain.models.catalog import Inventory
from app.domain.models.order import Order, OrderStatusHistory, Payment
from app.domain.ports.identity_port import IdentityPort
from app.domain.ports.payment_gateway_port import PaymentGatewayPort

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


def is_datetime_expired(expires_at: Optional[datetime]) -> bool:
    """Safe comparison supporting both timezone-aware and naive timestamps."""
    if not expires_at:
        return False
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        return now.replace(tzinfo=None) > expires_at
    return now > expires_at


@contextlib.asynccontextmanager
async def acquire_order_locks(order: Order):
    """Acquires in-process locks for all variants in sorted order to prevent race conditions."""
    variant_ids = sorted(list({item.variant_id for item in order.items if item.variant_id}))
    locks = [get_variant_lock(vid) for vid in variant_ids]
    for lock in locks:
        await lock.acquire()
    try:
        yield
    finally:
        for lock in reversed(locks):
            lock.release()


async def clear_cart_for_user_or_guest(order: Order, db: AsyncSession) -> None:
    """Empties the shopping bag following verified payment confirmation."""
    if order.user_id:
        cart_res = await db.execute(
            select(Cart).where(Cart.user_id == order.user_id)
        )
        cart = cart_res.scalar_one_or_none()
        if cart:
            await db.execute(
                delete(CartItem).where(CartItem.cart_id == cart.id)
            )


@router.post("/razorpay/create", response_model=RazorpayCreateOrderResponse)
async def create_razorpay_order(
    payload: RazorpayCreateOrderRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
    payment_gw: PaymentGatewayPort = Depends(get_payment_gateway),
) -> RazorpayCreateOrderResponse:
    """
    Creates a Razorpay payment order for an existing pending DRAPE order.
    Validates order status, customer ownership, and active inventory availability.
    """
    # Verify customer identity if authenticated
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    user_id = None
    if token:
        try:
            sess = await identity.verify_token(token)
            user_id = sess.user_id
        except Exception:
            user_id = None

    # Retrieve Order
    result = await db.execute(
        select(Order)
        .where(Order.id == payload.order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    # Ownership check
    if order.user_id:
        if not user_id or order.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or pay for this order.",
            )
    elif order.guest_token:
        caller_guest = x_guest_token or drape_guest_token
        if not caller_guest or caller_guest != order.guest_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to view or pay for this guest order.",
            )

    # Currency validation
    if order.currency.upper() not in {"USD"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported currency '{order.currency}'.",
        )

    if order.payment_status == "paid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has already been paid.",
        )

    if order.status in ("cancelled", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This order cannot be paid because it is {order.status}.",
        )

    # Check expiration
    if is_datetime_expired(order.expires_at):
        prev_status = order.status
        order.status = "cancelled"
        order.status_history.append(
            OrderStatusHistory(
                order_id=order.id,
                from_status=prev_status,
                to_status="cancelled",
                reason="Checkout session expired prior to payment initialization",
            )
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This checkout session has expired. Please initiate a new order.",
        )

    # Re-verify inventory before opening gateway session
    for item in order.items:
        if item.variant_id:
            inv_res = await db.execute(
                select(Inventory).where(Inventory.variant_id == item.variant_id)
            )
            inv = inv_res.scalar_one_or_none()
            if not inv or inv.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Stock depleted for SKU {item.sku}. Cannot proceed with payment.",
                )

    amount_cents = int((order.total_amount * Decimal("100")).quantize(Decimal("1")))
    
    # Initialize gateway session
    try:
        session = await payment_gw.create_payment_session(
            amount_cents=amount_cents,
            currency=order.currency,
            customer_id=order.user_id or "guest",
            idempotency_key=order.id,
            metadata={"order_number": order.order_number},
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    # Create or update Payment entity
    payment_record = next(
        (p for p in order.payments if p.provider_order_id == session.session_id),
        None,
    )
    if not payment_record:
        payment_record = Payment(
            order_id=order.id,
            provider="razorpay",
            provider_order_id=session.session_id,
            amount=order.total_amount,
            currency=order.currency,
            status="pending",
        )
        db.add(payment_record)
        await db.commit()

    customer_info = order.shipping_address_snapshot or {}

    return RazorpayCreateOrderResponse(
        razorpay_order_id=session.session_id,
        amount_cents=amount_cents,
        currency=order.currency,
        key_id=session.client_secret,
        order_number=order.order_number,
        customer_name=customer_info.get("full_name"),
        customer_email=None,
        customer_phone=customer_info.get("phone"),
    )


@router.post("/razorpay/verify", response_model=PaymentVerificationResponse)
async def verify_razorpay_payment(
    payload: RazorpayVerifyPaymentRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
    payment_gw: PaymentGatewayPort = Depends(get_payment_gateway),
) -> PaymentVerificationResponse:
    """
    Verifies Razorpay HMAC signature server-side.
    Atomically deducts inventory and confirms the order idempotently.
    Enforces terminal state integrity and rejects tampered provider IDs or amounts.
    """
    # Verify customer identity if authenticated
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    user_id = None
    if token:
        try:
            sess = await identity.verify_token(token)
            user_id = sess.user_id
        except Exception:
            user_id = None

    result = await db.execute(
        select(Order)
        .where(Order.id == payload.order_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
        .with_for_update()
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    # Ownership check
    if order.user_id:
        if not user_id or order.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to confirm payment for this order.",
            )
    elif order.guest_token:
        caller_guest = x_guest_token or drape_guest_token
        if not caller_guest or caller_guest != order.guest_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to confirm payment for this guest order.",
            )

    # Idempotent response if already verified
    if order.payment_status == "paid":
        return PaymentVerificationResponse(
            success=True,
            order_id=order.id,
            order_number=order.order_number,
            status=order.status,
            payment_status=order.payment_status,
            transaction_id=payload.razorpay_payment_id,
            message="Payment already verified and confirmed.",
        )

    # Terminal state check
    if order.status in ("cancelled", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be confirmed because it is {order.status}.",
        )

    # Check order expiration before confirming payment
    if is_datetime_expired(order.expires_at):
        if order.status != "cancelled":
            prev_status = order.status
            order.status = "cancelled"
            order.status_history.append(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=prev_status,
                    to_status="cancelled",
                    reason="Order expired before payment was verified",
                )
            )
            await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order has expired and cannot be confirmed. Please place a new order.",
        )

    # Find associated Payment entity
    payment_record = next(
        (p for p in order.payments if p.provider_order_id == payload.razorpay_order_id),
        None,
    )
    if not payment_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider order ID '{payload.razorpay_order_id}' was not generated for this order.",
        )

    # Verify amount and currency
    if payment_record.amount != order.total_amount or payment_record.currency.upper() != order.currency.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment record amount or currency does not match the order record.",
        )

    # Verify HMAC signature
    is_valid = False
    try:
        if hasattr(payment_gw, "verify_payment_signature"):
            is_valid = payment_gw.verify_payment_signature(
                razorpay_order_id=payload.razorpay_order_id,
                razorpay_payment_id=payload.razorpay_payment_id,
                razorpay_signature=payload.razorpay_signature,
            )
        else:
            if (settings.ENVIRONMENT or "").strip().lower() == "production":
                is_valid = False
            else:
                is_valid = payload.razorpay_signature == "valid_mock_signature"
    except Exception as exc:
        logger.error(f"Error during signature verification: {exc}")
        is_valid = False

    if not is_valid:
        payment_record.status = "failed"
        payment_record.failure_reason = "Invalid HMAC signature"
        order.status_history.append(
            OrderStatusHistory(
                order_id=order.id,
                from_status=order.status,
                to_status="payment_failed",
                reason="Invalid Razorpay HMAC signature",
            )
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature. Verification failed.",
        )

    # Signature is valid -> Atomically deduct inventory inside sorted locks
    sorted_items = sorted(
        [it for it in order.items if it.variant_id],
        key=lambda x: str(x.variant_id),
    )
    async with acquire_order_locks(order):
        # Refresh order from DB to catch any concurrent commits by another worker/request
        await db.refresh(order)
        # Recheck payment_status under locks for multi-worker idempotency
        if order.payment_status == "paid":
            return PaymentVerificationResponse(
                success=True,
                order_id=order.id,
                order_number=order.order_number,
                status=order.status,
                payment_status=order.payment_status,
                transaction_id=payload.razorpay_payment_id,
                message="Payment already verified and confirmed.",
            )

        for item in sorted_items:
            inv_res = await db.execute(
                select(Inventory)
                .where(Inventory.variant_id == item.variant_id)
                .with_for_update()
            )
            inv = inv_res.scalar_one_or_none()
            if not inv or inv.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Inventory depleted for SKU {item.sku}. Unable to complete order fulfillment.",
                )
            inv.quantity -= item.quantity

        # Update Payment & Order state
        payment_record.status = "captured"
        payment_record.provider_payment_id = payload.razorpay_payment_id
        payment_record.provider_signature = payload.razorpay_signature

        old_status = order.status
        order.payment_status = "paid"
        order.status = "processing"

        order.status_history.append(
            OrderStatusHistory(
                order_id=order.id,
                from_status=old_status,
                to_status="processing",
                reason=f"Payment verified via Razorpay ID {payload.razorpay_payment_id}",
            )
        )

        # Empty user's cart
        await clear_cart_for_user_or_guest(order, db)
        await db.commit()

        # Automatic purchase ingestion into customer's smart wardrobe
        try:
            from app.api.v1.endpoints.wardrobe import ingest_order_items_to_wardrobe
            await ingest_order_items_to_wardrobe(order, db)
        except Exception as e:
            logger.warning(f"Automatic wardrobe ingestion failed for order {order.id}: {e}")

    return PaymentVerificationResponse(
        success=True,
        order_id=order.id,
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        transaction_id=payload.razorpay_payment_id,
        message="Payment successfully verified.",
    )


@router.post("/webhooks/razorpay")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    payment_gw: PaymentGatewayPort = Depends(get_payment_gateway),
) -> Dict[str, Any]:
    """
    Receives and verifies raw Razorpay webhook events.
    Guarantees idempotency and safe multi-worker transaction integrity.
    """
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature") or request.headers.get("x-razorpay-signature") or ""

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Razorpay signature header.",
        )

    is_valid = await payment_gw.verify_webhook_signature(
        payload_bytes=raw_body,
        signature_header=signature,
    )
    if not is_valid:
        logger.warning("Razorpay webhook signature verification failed.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature.",
        )

    try:
        event_data = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON in webhook body.",
        ) from exc

    event_name = event_data.get("event")
    logger.info("Processing Razorpay webhook event: %s", event_name)

    if event_name in ("payment.captured", "order.paid"):
        payload_entity = (
            event_data.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        rzp_order_id = payload_entity.get("order_id")
        rzp_payment_id = payload_entity.get("id")
        notes = payload_entity.get("notes", {})
        order_number = notes.get("order_number")

        order_id = None
        if rzp_order_id:
            pay_res = await db.execute(
                select(Payment.order_id).where(Payment.provider_order_id == rzp_order_id)
            )
            order_id = pay_res.scalar_one_or_none()

        if not order_id and order_number:
            num_res = await db.execute(
                select(Order.id).where(Order.order_number == order_number)
            )
            order_id = num_res.scalar_one_or_none()

        if not order_id:
            logger.warning("Order not found for webhook: %s / %s", rzp_order_id, order_number)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for webhook event.",
            )

        # Lock the order record with SELECT FOR UPDATE
        order_res = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.payments),
                selectinload(Order.status_history),
            )
            .with_for_update()
        )
        order = order_res.scalar_one_or_none()

        if not order:
            logger.warning("Order not found for webhook: %s / %s", rzp_order_id, order_number)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for webhook event.",
            )

        # Idempotent skip if already confirmed
        if order.payment_status == "paid":
            return {"status": "ok", "message": "Order already confirmed"}

        # Reject late payment for expired or cancelled orders
        if order.status in ("cancelled", "failed") or is_datetime_expired(order.expires_at):
            if order.status != "cancelled":
                prev_status = order.status
                order.status = "cancelled"
                order.status_history.append(
                    OrderStatusHistory(
                        order_id=order.id,
                        from_status=prev_status,
                        to_status="cancelled",
                        reason="Late webhook payment rejected due to order expiration",
                    )
                )
                await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order has expired or been cancelled. Late payment capture rejected.",
            )

        # Validate amount and currency match
        webhook_amount = (Decimal(payload_entity.get("amount", 0)) / Decimal("100")).quantize(Decimal("0.01"))
        if webhook_amount != order.total_amount or payload_entity.get("currency", "").upper() != order.currency.upper():
            logger.critical(
                "CRITICAL: Payment amount or currency mismatch! Expected %s %s, got %s %s for Order %s",
                order.total_amount,
                order.currency,
                webhook_amount,
                payload_entity.get("currency"),
                order.order_number,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount or currency mismatch with order record.",
            )

        # Deduct inventory atomically inside sorted locks
        sorted_items = sorted(
            [it for it in order.items if it.variant_id],
            key=lambda x: str(x.variant_id),
        )
        async with acquire_order_locks(order):
            # Refresh order from DB to catch any concurrent commits by another worker/request
            await db.refresh(order)
            # Recheck payment_status under locks for multi-worker idempotency
            if order.payment_status == "paid":
                return {"status": "ok", "message": "Order already confirmed"}
            for item in sorted_items:
                inv_res = await db.execute(
                    select(Inventory)
                    .where(Inventory.variant_id == item.variant_id)
                    .with_for_update()
                )
                inv = inv_res.scalar_one_or_none()
                if not inv or inv.quantity < item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Inventory depleted for SKU {item.sku}. Unable to complete order fulfillment.",
                    )
                inv.quantity -= item.quantity

            # Update payment record
            payment_record = next(
                (p for p in order.payments if p.provider_order_id == rzp_order_id),
                None,
            )
            if not payment_record:
                payment_record = Payment(
                    order_id=order.id,
                    provider="razorpay",
                    provider_order_id=rzp_order_id,
                    amount=order.total_amount,
                    currency=order.currency,
                )
                db.add(payment_record)

            payment_record.status = "captured"
            payment_record.provider_payment_id = rzp_payment_id
            payment_record.provider_metadata = payload_entity

            old_status = order.status
            order.payment_status = "paid"
            order.status = "processing"

            order.status_history.append(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=old_status,
                    to_status="processing",
                    reason=f"Payment confirmed via Razorpay webhook ({event_name})",
                )
            )

            await clear_cart_for_user_or_guest(order, db)
            await db.commit()

            # Automatic purchase ingestion into customer's smart wardrobe
            try:
                from app.api.v1.endpoints.wardrobe import ingest_order_items_to_wardrobe
                await ingest_order_items_to_wardrobe(order, db)
            except Exception as e:
                logger.warning(f"Automatic wardrobe ingestion failed for order {order.id}: {e}")

        return {"status": "ok", "message": "Order confirmed via webhook"}

    elif event_name == "payment.failed":
        payload_entity = (
            event_data.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )
        rzp_order_id = payload_entity.get("order_id")
        rzp_payment_id = payload_entity.get("id")
        notes = payload_entity.get("notes", {})
        order_number = notes.get("order_number")

        order_id = None
        if rzp_order_id:
            pay_res = await db.execute(
                select(Payment.order_id).where(Payment.provider_order_id == rzp_order_id)
            )
            order_id = pay_res.scalar_one_or_none()

        if not order_id and order_number:
            num_res = await db.execute(
                select(Order.id).where(Order.order_number == order_number)
            )
            order_id = num_res.scalar_one_or_none()

        if not order_id:
            logger.warning("Order not found for failure webhook: %s / %s", rzp_order_id, order_number)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for failure webhook event.",
            )

        # Lock the order record with SELECT FOR UPDATE
        order_res = await db.execute(
            select(Order)
            .where(Order.id == order_id)
            .options(
                selectinload(Order.items),
                selectinload(Order.payments),
                selectinload(Order.status_history),
            )
            .with_for_update()
        )
        order = order_res.scalar_one_or_none()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found for failure webhook event.",
            )

        async with acquire_order_locks(order):
            # Refresh order from DB to catch any concurrent commits by another worker/request
            await db.refresh(order)

            # 1. Protect terminal confirmed state: never overwrite confirmed order with failure
            if order.payment_status == "paid" or order.status in ("processing", "shipped", "delivered"):
                logger.info(
                    "Ignoring payment.failed webhook for already confirmed order %s",
                    order.order_number,
                )
                return {"status": "ok", "message": "Order already confirmed; failure ignored"}

            payment_record = next(
                (p for p in order.payments if p.provider_order_id == rzp_order_id),
                None,
            )

            # 2. Never overwrite a captured payment with failed
            if payment_record and payment_record.status == "captured":
                logger.info(
                    "Payment record %s for order %s is already captured; failure ignored",
                    payment_record.id,
                    order.order_number,
                )
                return {"status": "ok", "message": "Payment already captured; failure ignored"}

            error_desc = payload_entity.get("error_description") or "Payment authorization failed at gateway"
            failure_reason = f"Gateway reported failed payment ({rzp_payment_id or 'unknown'}): {error_desc}"

            # 3. Duplicate Webhook Check: Ensure duplicate failure deliveries do not create duplicate transitions
            is_duplicate = False
            if payment_record and payment_record.status == "failed":
                if payment_record.provider_payment_id == rzp_payment_id or not rzp_payment_id:
                    is_duplicate = True

            if any(
                h.to_status == "payment_failed" and (
                    (rzp_payment_id and rzp_payment_id in (h.reason or ""))
                    or h.reason == failure_reason
                )
                for h in order.status_history
            ):
                is_duplicate = True

            if is_duplicate:
                return {"status": "ok", "message": "Payment failure already recorded"}

            # 4. Record or update Payment entity
            if not payment_record and rzp_order_id:
                payment_record = Payment(
                    order_id=order.id,
                    provider="razorpay",
                    provider_order_id=rzp_order_id,
                    amount=order.total_amount,
                    currency=order.currency,
                )
                db.add(payment_record)

            if payment_record:
                payment_record.status = "failed"
                payment_record.failure_reason = error_desc
                if rzp_payment_id:
                    payment_record.provider_payment_id = rzp_payment_id
                payment_record.provider_metadata = payload_entity

            # 5. Record OrderStatusHistory transition
            order.status_history.append(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=order.status,
                    to_status="payment_failed",
                    reason=failure_reason,
                )
            )
            await db.commit()

        return {"status": "ok", "message": "Payment failure recorded"}

    return {"status": "ignored", "reason": f"Unhandled event {event_name}"}
