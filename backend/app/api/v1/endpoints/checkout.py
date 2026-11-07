"""
DRAPE Checkout Endpoints.

Handles server-side pricing quotes, tax calculations, shipping method selection,
and pending order creation. Enforces inventory integrity and rejection of
client-tampered financial values.
Conforms to ADR-001, ADR-002, and RFC 9457 error contracts.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hmac
import secrets
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_db,
    get_identity_adapter,
    get_tax_calculator,
)
from app.api.v1.endpoints.cart import resolve_cart
from app.api.v1.schemas.checkout import (
    CheckoutQuoteRequest,
    CheckoutQuoteResponse,
    CreateOrderRequest,
    ShippingOption,
    TaxBreakdownItem,
)
from app.api.v1.schemas.order import OrderResponse
from app.core.config import settings
from app.domain.models.order import Address, Order, OrderItem, OrderStatusHistory
from app.domain.ports.identity_port import IdentityPort
from app.domain.ports.tax_calculation_port import (
    ShippingAddress,
    TaxCalculationPort,
)

router = APIRouter(prefix="/checkout", tags=["Checkout"])

SUPPORTED_CURRENCIES = {"USD"}
SUPPORTED_DESTINATION_COUNTRIES = {
    "UNITED STATES",
    "UNITED KINGDOM",
    "FRANCE",
    "ITALY",
    "JAPAN",
    "GERMANY",
    "US",
    "GB",
    "UK",
    "FR",
    "IT",
    "JP",
    "DE",
}


def generate_order_number() -> str:
    """Generates a unique luxury order reference, e.g. DRP-2026-8A3F29."""
    token = secrets.token_hex(3).upper()
    return f"DRP-2026-{token}"


def calculate_shipping_options(subtotal: Decimal) -> List[ShippingOption]:
    """Calculates shipping tiers based on subtotal and free-shipping thresholds."""
    is_standard_free = subtotal >= Decimal(str(settings.FREE_SHIPPING_THRESHOLD))
    standard_price = Decimal("0.00") if is_standard_free else Decimal("25.00")

    is_atelier_free = subtotal >= Decimal("1500.00")
    atelier_price = Decimal("0.00") if is_atelier_free else Decimal("75.00")

    return [
        ShippingOption(
            id="standard",
            name="Standard Delivery",
            description="3-5 business days across North America & Europe",
            amount=standard_price,
            currency="USD",
            estimated_days="3-5 business days",
            is_free=is_standard_free,
        ),
        ShippingOption(
            id="express",
            name="Express Courier",
            description="1-2 business days with priority customs clearance",
            amount=Decimal("45.00"),
            currency="USD",
            estimated_days="1-2 business days",
            is_free=False,
        ),
        ShippingOption(
            id="atelier",
            name="White-Glove Atelier Courier",
            description="Next-day personalized delivery in signature archival garment box",
            amount=atelier_price,
            currency="USD",
            estimated_days="Next-day delivery",
            is_free=is_atelier_free,
        ),
    ]


@router.post("/quote", response_model=CheckoutQuoteResponse)
async def get_checkout_quote(
    payload: CheckoutQuoteRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
    tax_calc: TaxCalculationPort = Depends(get_tax_calculator),
) -> CheckoutQuoteResponse:
    """
    Calculates verified server-side subtotal, shipping choices, and tax.
    Guarantees no client-submitted prices or amounts are accepted.
    """
    cart, user_id = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=payload.guest_token or x_guest_token,
        drape_guest_token=drape_guest_token,
    )

    if not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate checkout quote for an empty shopping bag.",
        )

    # Server-side subtotal calculation
    subtotal = Decimal("0.00")
    item_count = 0
    for item in cart.items:
        variant = item.variant
        if not variant or not variant.product or not variant.product.is_active:
            continue
        price = Decimal(str(variant.product.price))
        subtotal += price * Decimal(item.quantity)
        item_count += item.quantity

    if item_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shopping bag contains no active items.",
        )

    # Shipping options
    shipping_options = calculate_shipping_options(subtotal)
    selected_method_code = (payload.shipping_method or "standard").lower()
    selected_option = next(
        (opt for opt in shipping_options if opt.id == selected_method_code),
        shipping_options[0],
    )
    shipping_amount = selected_option.amount

    # Tax calculation
    shipping_addr_model: Optional[ShippingAddress] = None
    if payload.shipping_address:
        shipping_addr_model = ShippingAddress(
            line1=payload.shipping_address.line1,
            city=payload.shipping_address.city,
            state_province=payload.shipping_address.state,
            postal_code=payload.shipping_address.postal_code,
            country_code=payload.shipping_address.country,
        )
    elif payload.shipping_address_id and user_id:
        addr_res = await db.execute(
            select(Address).where(
                Address.id == payload.shipping_address_id,
                Address.user_id == user_id,
            )
        )
        saved_addr = addr_res.scalar_one_or_none()
        if saved_addr:
            shipping_addr_model = ShippingAddress(
                line1=saved_addr.line1,
                city=saved_addr.city,
                state_province=saved_addr.state,
                postal_code=saved_addr.postal_code,
                country_code=saved_addr.country,
            )

    tax_amount = Decimal("0.00")
    tax_breakdown_items: List[TaxBreakdownItem] = []

    if shipping_addr_model:
        tax_res = await tax_calc.calculate_tax(
            order_amount_cents=int(subtotal * 100),
            currency="USD",
            shipping_address=shipping_addr_model,
            item_tax_codes=[],
        )
        tax_amount = (Decimal(tax_res.total_tax_cents) / Decimal("100")).quantize(Decimal("0.01"))
        for j in tax_res.jurisdictions:
            tax_breakdown_items.append(
                TaxBreakdownItem(
                    jurisdiction=j.jurisdiction_name,
                    rate=j.rate,
                    amount=(Decimal(j.amount_cents) / Decimal("100")).quantize(Decimal("0.01")),
                )
            )
    else:
        # Default placeholder tax calculation if address not yet selected
        tax_amount = (subtotal * Decimal(str(settings.DEFAULT_TAX_RATE))).quantize(Decimal("0.01"))
        tax_breakdown_items.append(
            TaxBreakdownItem(
                jurisdiction="Estimated Standard Tax",
                rate=settings.DEFAULT_TAX_RATE,
                amount=tax_amount,
            )
        )

    discount_amount = Decimal("0.00")
    total_amount = (subtotal + shipping_amount + tax_amount - discount_amount).quantize(Decimal("0.01"))

    return CheckoutQuoteResponse(
        currency="USD",
        subtotal=subtotal.quantize(Decimal("0.01")),
        shipping_amount=shipping_amount.quantize(Decimal("0.01")),
        selected_shipping_method=selected_option.id,
        shipping_options=shipping_options,
        tax_amount=tax_amount,
        tax_breakdown=tax_breakdown_items,
        discount_amount=discount_amount,
        total_amount=total_amount,
        item_count=item_count,
        is_free_shipping_eligible=subtotal >= Decimal(str(settings.FREE_SHIPPING_THRESHOLD)),
    )


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_checkout_order(
    payload: CreateOrderRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
    tax_calc: TaxCalculationPort = Depends(get_tax_calculator),
) -> Order:
    """
    Converts active cart into a pending order with historical item snapshots.
    Revalidates inventory and locks rows against overselling.
    """
    cart, user_id = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=payload.guest_token or x_guest_token,
        drape_guest_token=drape_guest_token,
    )

    if not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot place order with an empty shopping bag.",
        )

    # Resolve shipping address snapshot
    address_snapshot = {}
    if payload.shipping_address_id and user_id:
        addr_res = await db.execute(
            select(Address).where(
                Address.id == payload.shipping_address_id,
                Address.user_id == user_id,
            )
        )
        saved_addr = addr_res.scalar_one_or_none()
        if not saved_addr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected saved address not found or does not belong to your account.",
            )
        address_snapshot = {
            "full_name": saved_addr.full_name,
            "phone": saved_addr.phone,
            "line1": saved_addr.line1,
            "line2": saved_addr.line2,
            "city": saved_addr.city,
            "state": saved_addr.state,
            "postal_code": saved_addr.postal_code,
            "country": saved_addr.country,
        }
    elif payload.shipping_address:
        address_snapshot = payload.shipping_address.model_dump()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A verified delivery address is required to place an order.",
        )

    # Validate destination country
    dest_country = str(address_snapshot.get("country", "")).strip().upper()
    if dest_country and dest_country not in SUPPORTED_DESTINATION_COUNTRIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Shipping to destination '{address_snapshot.get('country')}' is currently unsupported by DRAPE Atelier.",
        )

    # Revalidate inventory and calculate server-side subtotal
    subtotal = Decimal("0.00")
    order_items_to_create = []

    for item in cart.items:
        variant = item.variant
        if not variant or not variant.product or not variant.product.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An item in your bag is no longer available. Please review your cart.",
            )

        # Check stock availability
        inv = variant.inventory
        if not inv or inv.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Insufficient inventory for '{variant.product.name}' in size {variant.size}. Only {inv.quantity if inv else 0} remaining.",
            )

        price = Decimal(str(variant.product.price))
        line_total = (price * Decimal(item.quantity)).quantize(Decimal("0.01"))
        subtotal += line_total

        # Primary image snapshot
        primary_img = next((img.image_url for img in variant.product.images if img.is_primary), None)
        if not primary_img and variant.product.images:
            primary_img = variant.product.images[0].image_url

        order_items_to_create.append(
            {
                "product_id": variant.product.id,
                "variant_id": variant.id,
                "product_name": variant.product.name,
                "sku": variant.sku,
                "size": variant.size,
                "color": variant.color,
                "image_url": primary_img,
                "unit_price": price.quantize(Decimal("0.01")),
                "quantity": item.quantity,
                "line_total": line_total,
            }
        )

    # Shipping cost
    shipping_options = calculate_shipping_options(subtotal)
    selected_method_code = payload.shipping_method.lower()
    selected_option = next(
        (opt for opt in shipping_options if opt.id == selected_method_code),
        shipping_options[0],
    )
    shipping_amount = selected_option.amount

    # Tax calculation
    tax_addr = ShippingAddress(
        line1=address_snapshot.get("line1", ""),
        city=address_snapshot.get("city", ""),
        state_province=address_snapshot.get("state", ""),
        postal_code=address_snapshot.get("postal_code", ""),
        country_code=address_snapshot.get("country", "United States"),
    )
    tax_res = await tax_calc.calculate_tax(
        order_amount_cents=int(subtotal * 100),
        currency="USD",
        shipping_address=tax_addr,
        item_tax_codes=[],
    )
    tax_amount = (Decimal(tax_res.total_tax_cents) / Decimal("100")).quantize(Decimal("0.01"))
    total_amount = (subtotal + shipping_amount + tax_amount).quantize(Decimal("0.01"))

    # Order expiration (30 minutes)
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.PENDING_ORDER_EXPIRATION_MINUTES
    )

    # Determine guest token if unauthenticated
    assigned_guest_token = None
    if not user_id:
        assigned_guest_token = cart.guest_token or x_guest_token or drape_guest_token or getattr(payload, "guest_token", None)

    # Create Order record
    order = Order(
        user_id=user_id,
        guest_token=assigned_guest_token,
        order_number=generate_order_number(),
        status="pending",
        payment_status="unpaid",
        currency="USD",
        subtotal=subtotal.quantize(Decimal("0.01")),
        shipping_amount=shipping_amount.quantize(Decimal("0.01")),
        tax_amount=tax_amount,
        discount_amount=Decimal("0.00"),
        total_amount=total_amount,
        shipping_method=selected_option.name,
        shipping_address_snapshot=address_snapshot,
        customer_notes=payload.customer_notes.strip() if payload.customer_notes else None,
        expires_at=expires_at,
    )
    db.add(order)
    await db.flush()

    # Create OrderItems
    for item_data in order_items_to_create:
        order_item = OrderItem(
            order_id=order.id,
            **item_data,
        )
        db.add(order_item)

    # Create OrderStatusHistory record
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=None,
        to_status="pending",
        reason="Order initiated at checkout",
    )
    db.add(history)

    await db.commit()

    # Re-fetch order with relationships loaded
    full_order_res = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
    )
    return full_order_res.scalar_one()


@router.post("/cleanup-expired-orders")
async def cleanup_expired_orders(
    x_admin_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> dict:
    """
    Sweeps pending orders that have exceeded their 30-minute reservation window.
    Transitions expired orders to 'cancelled' and records the state transition.
    Requires internal administrative authorization in production.
    """
    is_production = settings.ENVIRONMENT.lower() == "production"
    is_authorized = False

    # 1. Check administrative API key with timing-safe comparison
    if x_admin_key and settings.ADMIN_API_KEY:
        if hmac.compare_digest(x_admin_key.strip(), settings.ADMIN_API_KEY.strip()):
            is_authorized = True

    # 2. Check admin JWT session
    if not is_authorized and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            session = await identity.verify_token(token)
            if any(role in session.roles for role in ("admin", "system_admin")):
                is_authorized = True
        except Exception:
            pass

    if is_production and not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative authorization required to trigger order cleanup.",
        )

    now = datetime.now(timezone.utc)
    expired_res = await db.execute(
        select(Order)
        .where(
            Order.status == "pending",
            Order.payment_status == "unpaid",
            Order.expires_at < now,
        )
        .options(selectinload(Order.status_history))
    )
    expired_orders = list(expired_res.scalars().all())

    count = 0
    for ord_item in expired_orders:
        ord_item.status = "cancelled"
        ord_item.status_history.append(
            OrderStatusHistory(
                order_id=ord_item.id,
                from_status="pending",
                to_status="cancelled",
                reason="Order reservation expired after 30 minutes without confirmed payment",
            )
        )
        count += 1

    if count > 0:
        await db.commit()

    return {"status": "success", "cancelled_count": count}

