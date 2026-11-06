"""
DRAPE Payment Processing & Razorpay Verification Test Suite.

Verifies:
1. Razorpay checkout order initiation (/api/v1/payments/razorpay/create).
2. Successful server-side HMAC-SHA256 signature verification (/api/v1/payments/razorpay/verify).
3. Invalid payment signature rejection and failure auditing.
4. Duplicate verification idempotency (no double-deduction of inventory).
5. Inbound webhook raw-body HMAC signature validation (/api/v1/payments/webhooks/razorpay).
6. Webhook rejection on currency or amount mismatch against order record.
7. Webhook idempotency on duplicate delivery.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import hmac
import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import set_payment_gateway
from app.core.config import settings
from app.domain.models.cart import Cart, CartItem
from app.domain.models.catalog import Inventory
from app.domain.models.order import Order, OrderStatusHistory
from app.infrastructure.adapters.razorpay_payment_adapter import RazorpayPaymentAdapter
from tests.conftest import TestingSessionLocal


@pytest.fixture(autouse=True)
def setup_test_razorpay_gateway():
    """Sets up a test RazorpayPaymentAdapter with known secret keys for HMAC testing."""
    key_secret = "test_secret_key_drape_m3"
    webhook_secret = "test_webhook_secret_drape_m3"
    adapter = RazorpayPaymentAdapter(
        key_id="rzp_test_key_id",
        key_secret=key_secret,
        webhook_secret=webhook_secret,
    )
    set_payment_gateway(adapter)
    yield
    # Restore default
    set_payment_gateway(
        RazorpayPaymentAdapter(
            key_id=settings.RAZORPAY_KEY_ID,
            key_secret=settings.RAZORPAY_KEY_SECRET,
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
    )


def compute_razorpay_signature(order_id: str, payment_id: str, secret: str = "test_secret_key_drape_m3") -> str:
    """Computes exact Razorpay checkout return HMAC-SHA256."""
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def compute_webhook_signature(payload_bytes: bytes, secret: str = "test_webhook_secret_drape_m3") -> str:
    """Computes exact Razorpay webhook HMAC-SHA256."""
    return hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
async def test_razorpay_create_and_verify_payment_flow(client: AsyncClient):
    """Verifies end-to-end checkout payment initiation, signature verification, and cart clearing."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "payment.success@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    user_id = user_res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item
    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    product = prod_res.json()
    variant = product["variants"][0]
    variant_id = variant["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    # Initial inventory
    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        initial_stock = inv_res.scalar_one().quantity

    # Place order
    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Payment Customer",
                "phone": "+1-555-8888",
                "line1": "Boulevard Saint-Germain",
                "city": "Paris",
                "state": "IDF",
                "postal_code": "75006",
                "country": "France",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]

    # 1. Create Razorpay order session
    create_rzp = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert create_rzp.status_code == 200
    rzp_order = create_rzp.json()
    rzp_order_id = rzp_order["razorpay_order_id"]
    assert rzp_order["order_number"] == order_data["order_number"]

    # 2. Test Invalid Signature Rejection
    fake_payment_id = "pay_fake_12345"
    bad_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": "invalid_forged_signature_hash",
        },
        headers=headers,
    )
    assert bad_verify.status_code == 400
    assert "invalid payment signature" in bad_verify.json()["detail"].lower()

    # Stock must NOT be deducted yet!
    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        assert inv_res.scalar_one().quantity == initial_stock

    # 3. Test Valid Signature Verification
    valid_payment_id = "pay_live_987654"
    valid_sig = compute_razorpay_signature(rzp_order_id, valid_payment_id)

    good_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": valid_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=headers,
    )
    assert good_verify.status_code == 200
    verify_result = good_verify.json()
    assert verify_result["success"] is True
    assert verify_result["payment_status"] == "paid"
    assert verify_result["status"] == "processing"

    # Inventory must now be decremented by exactly 1!
    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        assert inv_res.scalar_one().quantity == initial_stock - 1

        # Customer's cart must now be empty
        cart_res = await session.execute(
            select(Cart).where(Cart.user_id == user_id)
        )
        cart = cart_res.scalar_one()
        items_res = await session.execute(
            select(CartItem).where(CartItem.cart_id == cart.id)
        )
        assert len(items_res.scalars().all()) == 0

    # 4. Idempotent re-verification (should succeed without double deduction)
    dup_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": valid_payment_id,
            "razorpay_signature": valid_sig,
        },
        headers=headers,
    )
    assert dup_verify.status_code == 200
    assert dup_verify.json()["payment_status"] == "paid"

    # Verify inventory was NOT double-decremented
    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        assert inv_res.scalar_one().quantity == initial_stock - 1


@pytest.mark.asyncio
async def test_razorpay_webhook_processing(client: AsyncClient):
    """Verifies inbound webhook signature validation, idempotency, and amount check."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "webhook.tester@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/tailored-wool-barathea-blazer")
    product = prod_res.json()
    variant = product["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Webhook Recipient",
                "phone": "+1-555-3333",
                "line1": "Via Condotti",
                "city": "Rome",
                "state": "RM",
                "postal_code": "00187",
                "country": "Italy",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    total_cents = int(Decimal(str(order_data["total_amount"])) * 100)

    # 1. Missing signature header
    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_hook_111",
                    "order_id": f"order_rzp_{order_id.replace('-', '')[:16]}",
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "captured",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    raw_json = json.dumps(webhook_payload).encode("utf-8")

    no_sig = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_json,
        headers={"Content-Type": "application/json"},
    )
    assert no_sig.status_code == 400

    # 2. Invalid webhook signature
    bad_sig = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_json,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "invalid_forged_webhook_signature",
        },
    )
    assert bad_sig.status_code == 400

    # 3. Webhook with Amount Mismatch -> Tampering rejected
    tampered_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_tampered_999",
                    "order_id": f"order_rzp_{order_id.replace('-', '')[:16]}",
                    "amount": total_cents - 5000,  # Underpaid
                    "currency": "USD",
                    "status": "captured",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    tampered_bytes = json.dumps(tampered_payload).encode("utf-8")
    tampered_sig = compute_webhook_signature(tampered_bytes)

    mismatch_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=tampered_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": tampered_sig,
        },
    )
    assert mismatch_res.status_code == 400
    assert "mismatch" in mismatch_res.json()["detail"].lower()

    # 4. Valid Webhook
    valid_sig = compute_webhook_signature(raw_json)
    valid_webhook_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_json,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": valid_sig,
        },
    )
    assert valid_webhook_res.status_code == 200
    assert valid_webhook_res.json()["status"] == "ok"

    # Order must now be confirmed in DB
    order_check = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert order_check.status_code == 200
    assert order_check.json()["payment_status"] == "paid"
    assert order_check.json()["status"] == "processing"

    # 5. Duplicate Webhook delivery (idempotent)
    dup_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_json,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": valid_sig,
        },
    )
    assert dup_res.status_code == 200
    assert "already confirmed" in dup_res.json()["message"]


@pytest.mark.asyncio
async def test_concurrent_payment_verification_idempotency_and_single_deduction(client: AsyncClient):
    """
    Simulates concurrent client payment verification calls on the same order.
    Verifies that:
    1. Both requests succeed (200 OK).
    2. Inventory is deducted only once (no duplicate deduction).
    3. Status history records exactly one transition to processing.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "concurrent.verify@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    # Initial inventory
    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        initial_stock = inv_res.scalar_one().quantity

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Concurrent Verification Customer",
                "phone": "+1-555-9999",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_id = order_res.json()["id"]

    session_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert session_res.status_code == 200
    rzp_order_id = session_res.json()["razorpay_order_id"]
    payment_id = "pay_concurrent_123"
    signature = compute_razorpay_signature(rzp_order_id, payment_id)

    verify_payload = {
        "order_id": order_id,
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    }

    # Execute concurrent payment verification requests
    res1, res2 = await asyncio.gather(
        client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers),
        client.post("/api/v1/payments/razorpay/verify", json=verify_payload, headers=headers),
    )

    assert res1.status_code == 200
    assert res2.status_code == 200
    assert res1.json()["success"] is True
    assert res2.json()["success"] is True

    # Verify inventory was deducted exactly once
    async with TestingSessionLocal() as session:
        inv_check = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one()
        assert inv_check.quantity == initial_stock - 1

        # Check status history
        ord_obj = (
            await session.execute(
                select(Order).options(selectinload(Order.status_history)).where(Order.id == order_id)
            )
        ).scalar_one()
        processing_entries = [h for h in ord_obj.status_history if h.to_status == "processing"]
        assert len(processing_entries) == 1


@pytest.mark.asyncio
async def test_concurrent_webhook_delivery_idempotency_and_single_deduction(client: AsyncClient):
    """
    Simulates concurrent webhook events for payment.captured on the same order.
    Verifies that inventory is deducted only once and both webhook requests succeed.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "concurrent.webhook@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        initial_stock = inv_res.scalar_one().quantity

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Concurrent Webhook Customer",
                "phone": "+1-555-7777",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    total_cents = int(Decimal(str(order_data["total_amount"])) * 100)

    session_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert session_res.status_code == 200
    rzp_order_id = session_res.json()["razorpay_order_id"]

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_concurrent_hook_456",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "captured",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    raw_json = json.dumps(webhook_payload).encode("utf-8")
    valid_sig = compute_webhook_signature(raw_json)

    # Deliver concurrent webhooks
    res1, res2 = await asyncio.gather(
        client.post(
            "/api/v1/payments/webhooks/razorpay",
            content=raw_json,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": valid_sig},
        ),
        client.post(
            "/api/v1/payments/webhooks/razorpay",
            content=raw_json,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": valid_sig},
        ),
    )

    assert res1.status_code == 200
    assert res2.status_code == 200

    async with TestingSessionLocal() as session:
        inv_check = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one()
        assert inv_check.quantity == initial_stock - 1


@pytest.mark.asyncio
async def test_expired_order_status_history_previous_status(client: AsyncClient):
    """
    Verifies that when an expired order transitions to 'cancelled',
    the OrderStatusHistory.from_status correctly records the actual previous status ('pending'),
    NOT 'cancelled'.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "expired.history@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Expired History Customer",
                "phone": "+1-555-5555",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_id = order_res.json()["id"]

    # Artificially set expires_at in the past
    async with TestingSessionLocal() as session:
        ord_obj = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        assert ord_obj.status == "pending"
        ord_obj.expires_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        await session.commit()

    # Attempting to create a payment session on an expired order triggers cancellation
    create_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert create_res.status_code == 400
    assert "expired" in create_res.json()["detail"].lower()

    # Verify OrderStatusHistory from_status was 'pending' and to_status was 'cancelled'
    async with TestingSessionLocal() as session:
        ord_check = (
            await session.execute(
                select(Order).options(selectinload(Order.status_history)).where(Order.id == order_id)
            )
        ).scalar_one()
        assert ord_check.status == "cancelled"

        cancel_entries = [h for h in ord_check.status_history if h.to_status == "cancelled"]
        assert len(cancel_entries) >= 1
        assert cancel_entries[-1].from_status == "pending"
        assert cancel_entries[-1].to_status == "cancelled"


@pytest.mark.asyncio
async def test_concurrent_payment_failed_and_payment_captured_webhooks(client: AsyncClient):
    """
    Simulates racing concurrent payment.failed and payment.captured webhooks on the same order.
    Verifies that:
    1. Both requests are processed without crashing.
    2. A successful capture takes precedence and locks the order in 'paid'/'processing'.
    3. The failure event never overwrites an already confirmed/paid order.
    4. Inventory is decremented exactly once.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "race.capture.fail@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    async with TestingSessionLocal() as session:
        inv_res = await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))
        initial_stock = inv_res.scalar_one().quantity

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Race Customer",
                "phone": "+1-555-1111",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    total_cents = int(Decimal(str(order_data["total_amount"])) * 100)

    session_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert session_res.status_code == 200
    rzp_order_id = session_res.json()["razorpay_order_id"]

    # Prepare captured payload
    captured_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_race_captured_789",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "captured",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    captured_raw = json.dumps(captured_payload).encode("utf-8")
    captured_sig = compute_webhook_signature(captured_raw)

    # Prepare failed payload
    failed_payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_race_failed_789",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "failed",
                    "error_description": "Card issuer declined transaction",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    failed_raw = json.dumps(failed_payload).encode("utf-8")
    failed_sig = compute_webhook_signature(failed_raw)

    # Dispatch concurrently
    res_cap, res_fail = await asyncio.gather(
        client.post(
            "/api/v1/payments/webhooks/razorpay",
            content=captured_raw,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": captured_sig},
        ),
        client.post(
            "/api/v1/payments/webhooks/razorpay",
            content=failed_raw,
            headers={"Content-Type": "application/json", "X-Razorpay-Signature": failed_sig},
        ),
    )

    assert res_cap.status_code == 200
    assert res_fail.status_code == 200

    # Verify order state is paid and processing
    async with TestingSessionLocal() as session:
        ord_check = (
            await session.execute(
                select(Order).options(selectinload(Order.status_history), selectinload(Order.payments)).where(Order.id == order_id)
            )
        ).scalar_one()
        assert ord_check.payment_status == "paid"
        assert ord_check.status == "processing"

        # Inventory must be decremented exactly once
        inv_check = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one()
        assert inv_check.quantity == initial_stock - 1

        # Captured payment must not be marked failed
        captured_payment = next((p for p in ord_check.payments if p.provider_order_id == rzp_order_id), None)
        assert captured_payment is not None
        assert captured_payment.status == "captured"

        # No failure transition appended after processing transition
        processing_idx = next(i for i, h in enumerate(ord_check.status_history) if h.to_status == "processing")
        subsequent_statuses = [h.to_status for h in ord_check.status_history[processing_idx + 1:]]
        assert "payment_failed" not in subsequent_statuses


@pytest.mark.asyncio
async def test_late_payment_failed_event_after_successful_payment_confirmation(client: AsyncClient):
    """
    Verifies that a late payment.failed webhook arriving after successful payment confirmation
    is safely ignored without downgrading order status or appending failure history.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "late.failed@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Late Failure Customer",
                "phone": "+1-555-2222",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    total_cents = int(Decimal(str(order_data["total_amount"])) * 100)

    session_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = session_res.json()["razorpay_order_id"]

    # 1. Successfully confirm payment via webhook
    captured_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_confirmed_111",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "captured",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    cap_raw = json.dumps(captured_payload).encode("utf-8")
    cap_sig = compute_webhook_signature(cap_raw)

    cap_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=cap_raw,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": cap_sig},
    )
    assert cap_res.status_code == 200

    # 2. Later, a payment.failed event arrives (e.g. out of order delivery from gateway)
    late_failed_payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_late_fail_222",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "failed",
                    "error_description": "Network timeout on alternative attempt",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    late_raw = json.dumps(late_failed_payload).encode("utf-8")
    late_sig = compute_webhook_signature(late_raw)

    late_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=late_raw,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": late_sig},
    )
    assert late_res.status_code == 200
    assert "already confirmed" in late_res.json()["message"].lower() or "failure ignored" in late_res.json()["message"].lower()

    # 3. Verify order remains paid and processing
    async with TestingSessionLocal() as session:
        ord_check = (
            await session.execute(
                select(Order).options(selectinload(Order.status_history), selectinload(Order.payments)).where(Order.id == order_id)
            )
        ).scalar_one()
        assert ord_check.payment_status == "paid"
        assert ord_check.status == "processing"

        payment_rec = next(p for p in ord_check.payments if p.provider_order_id == rzp_order_id)
        assert payment_rec.status == "captured"

        # Assert zero payment_failed status transitions
        failed_entries = [h for h in ord_check.status_history if h.to_status == "payment_failed"]
        assert len(failed_entries) == 0


@pytest.mark.asyncio
async def test_duplicate_payment_failed_webhook_delivery(client: AsyncClient):
    """
    Verifies that duplicate deliveries of payment.failed webhook events
    do not append duplicate failure history transitions to OrderStatusHistory.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate.failed@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Duplicate Failure Customer",
                "phone": "+1-555-3333",
                "line1": "742 Evergreen Terr",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]
    order_number = order_data["order_number"]
    total_cents = int(Decimal(str(order_data["total_amount"])) * 100)

    session_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = session_res.json()["razorpay_order_id"]

    failed_payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_fail_dup_333",
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "failed",
                    "error_description": "Card declined: insufficient funds",
                    "notes": {"order_number": order_number},
                }
            }
        },
    }
    raw_bytes = json.dumps(failed_payload).encode("utf-8")
    sig = compute_webhook_signature(raw_bytes)

    # 1. First webhook delivery -> recorded
    res1 = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert res1.status_code == 200
    assert "recorded" in res1.json()["message"].lower()

    # 2. Second webhook delivery (duplicate) -> recognized as duplicate
    res2 = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": sig},
    )
    assert res2.status_code == 200
    assert "already recorded" in res2.json()["message"].lower()

    # 3. Assert exactly ONE payment_failed entry in status_history
    async with TestingSessionLocal() as session:
        ord_check = (
            await session.execute(
                select(Order).options(selectinload(Order.status_history), selectinload(Order.payments)).where(Order.id == order_id)
            )
        ).scalar_one()
        failed_entries = [h for h in ord_check.status_history if h.to_status == "payment_failed"]
        assert len(failed_entries) == 1



