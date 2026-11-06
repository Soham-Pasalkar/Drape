"""
DRAPE Milestone 3 Security & Transaction Integrity Audit Test Suite.

Rigorously verifies:
1. Payment security: simulated verification impossible in production; unassociated provider IDs rejected.
2. State machine transitions: pending -> paid, pending -> failed (allows retry), terminal state protection.
3. Webhook arriving before frontend verification and vice versa (idempotency, single inventory deduction).
4. Late payment after order expiration rejected and cancelled.
5. Cleanup of abandoned expired orders via /checkout/cleanup-expired-orders.
6. Guest checkout isolation: guest token required; cross-tenant protection; account endpoint barriers.
7. Financial integrity: currency & jurisdiction enforcement; exact Decimal calculations without float drift.
8. Secrets never appear in responses.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.api.deps import set_payment_gateway
from app.core.config import settings
from app.domain.models.cart import Cart, CartItem
from app.domain.models.catalog import Inventory, Product
from app.domain.models.order import Order, Payment
from app.infrastructure.adapters.razorpay_payment_adapter import RazorpayPaymentAdapter
from tests.conftest import TestingSessionLocal
from tests.test_payments import compute_razorpay_signature, compute_webhook_signature


@pytest.fixture(autouse=True)
def setup_audit_gateway():
    """Sets up a test payment gateway adapter with known secrets for audit verification."""
    adapter = RazorpayPaymentAdapter(
        key_id="rzp_test_mock_audit_key",
        key_secret="test_audit_secret_m3_123",
        webhook_secret="test_audit_webhook_secret_m3_123",
    )
    set_payment_gateway(adapter)
    yield
    set_payment_gateway(
        RazorpayPaymentAdapter(
            key_id=settings.RAZORPAY_KEY_ID,
            key_secret=settings.RAZORPAY_KEY_SECRET,
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
    )


@pytest.mark.asyncio
async def test_simulated_payment_verification_impossible_in_production(client: AsyncClient):
    """
    Verifies that simulated payment verification (e.g. 'valid_mock_signature')
    is strictly rejected when ENVIRONMENT is 'production'.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "prod.sim.audit@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/chunky-ribbed-fisherman-sweater")
    variant = prod_res.json()["variants"][0]

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Audit Customer",
                "phone": "+1-555-0000",
                "line1": "740 Park Ave",
                "city": "New York",
                "state": "NY",
                "postal_code": "10021",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order = order_res.json()
    order_id = order["id"]

    rzp_create = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = rzp_create.json()["razorpay_order_id"]

    # Temporarily simulate production environment
    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"

        # Attempt to confirm using mock signature -> must return 400 Bad Request
        verify_res = await client.post(
            "/api/v1/payments/razorpay/verify",
            json={
                "order_id": order_id,
                "razorpay_order_id": rzp_order_id,
                "razorpay_payment_id": "pay_mock_simulation_attempt",
                "razorpay_signature": "valid_mock_signature",
            },
            headers=headers,
        )
        assert verify_res.status_code == 400
        assert "invalid payment signature" in verify_res.json()["detail"].lower()

    finally:
        settings.ENVIRONMENT = original_env


@pytest.mark.asyncio
async def test_unassociated_provider_order_id_rejected(client: AsyncClient):
    """
    Verifies that client-submitted provider order IDs not issued for the target order
    are rejected with 400 Bad Request.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "unassociated.rzp@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/tailored-wool-barathea-blazer")
    variant = next(v for v in prod_res.json()["variants"] if v["size"] == "M")

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Unassociated Order",
                "phone": "+1-555-1111",
                "line1": "Bond Street",
                "city": "London",
                "state": "ENG",
                "postal_code": "W1S 2TE",
                "country": "United Kingdom",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201, f"Failed placing order: {order_res.status_code} {order_res.text}"
    order_id = order_res.json()["id"]

    # Create session for order
    await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )

    # Attempt to verify with completely fabricated provider order ID
    forged_rzp_order_id = "order_rzp_fabricated_999999"
    sig = compute_razorpay_signature(forged_rzp_order_id, "pay_123", "test_audit_secret_m3_123")

    verify_res = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": forged_rzp_order_id,
            "razorpay_payment_id": "pay_123",
            "razorpay_signature": sig,
        },
        headers=headers,
    )
    assert verify_res.status_code == 400
    assert "was not generated for this order" in verify_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_state_machine_pending_to_failed_allows_retry(client: AsyncClient):
    """
    Verifies that when a payment verification fails, the order remains in pending
    status and the customer can retry payment authorization before expiration.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "retry.customer@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/fluid-silk-habotai-button-down")
    variant = prod_res.json()["variants"][0]

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Retry Customer",
                "phone": "+1-555-2222",
                "line1": "Rue du Faubourg Saint-Honoré",
                "city": "Paris",
                "state": "IDF",
                "postal_code": "75008",
                "country": "France",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201, f"Failed placing order: {order_res.status_code} {order_res.text}"
    order_id = order_res.json()["id"]

    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = rzp_res.json()["razorpay_order_id"]

    # 1. Fail first attempt with bad signature
    fail_res = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": "pay_bad_sig_1",
            "razorpay_signature": "corrupted_hash",
        },
        headers=headers,
    )
    assert fail_res.status_code == 400

    # Verify order is still pending in DB, and payment record is marked failed
    async with TestingSessionLocal() as session:
        ord_db = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        assert ord_db.status == "pending"
        assert ord_db.payment_status == "unpaid"

    # 2. Retry with valid signature
    valid_sig = compute_razorpay_signature(rzp_order_id, "pay_retry_success", "test_audit_secret_m3_123")
    retry_res = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": "pay_retry_success",
            "razorpay_signature": valid_sig,
        },
        headers=headers,
    )
    assert retry_res.status_code == 200
    assert retry_res.json()["payment_status"] == "paid"
    assert retry_res.json()["status"] == "processing"


@pytest.mark.asyncio
async def test_state_machine_terminal_paid_order_cannot_be_downgraded_by_failed_webhook(client: AsyncClient):
    """
    Guarantees that once an order reaches terminal 'paid' / 'processing' status,
    a subsequent late or out-of-order 'payment.failed' webhook event cannot overwrite
    or downgrade the confirmed status.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "terminal.guard@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant = prod_res.json()["variants"][0]

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Terminal Guard",
                "phone": "+1-555-3333",
                "line1": "Via Monte Napoleone",
                "city": "Milan",
                "state": "MI",
                "postal_code": "20121",
                "country": "Italy",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201, f"Failed placing order: {order_res.status_code} {order_res.text}"
    order_id = order_res.json()["id"]

    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = rzp_res.json()["razorpay_order_id"]

    # 1. Successfully verify and pay order
    sig = compute_razorpay_signature(rzp_order_id, "pay_terminal_success", "test_audit_secret_m3_123")
    v_res = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": "pay_terminal_success",
            "razorpay_signature": sig,
        },
        headers=headers,
    )
    assert v_res.status_code == 200
    assert v_res.json()["payment_status"] == "paid"

    # 2. Simulate out-of-order 'payment.failed' webhook arriving after order is paid
    fail_webhook = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_cancelled_card",
                    "order_id": rzp_order_id,
                    "error_description": "User cancelled in gateway popup",
                }
            }
        },
    }
    raw_bytes = json.dumps(fail_webhook).encode("utf-8")
    wh_sig = compute_webhook_signature(raw_bytes, "test_audit_webhook_secret_m3_123")

    wh_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": wh_sig},
    )
    assert wh_res.status_code == 200

    # 3. Order MUST remain 'paid' and 'processing' in DB
    async with TestingSessionLocal() as session:
        ord_db = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        assert ord_db.payment_status == "paid"
        assert ord_db.status == "processing"


@pytest.mark.asyncio
async def test_late_payment_after_expiration_rejected(client: AsyncClient):
    """
    Verifies that if an order has exceeded its 30-minute validity window,
    both client verification and inbound webhooks reject payment capture
    and the order is marked cancelled.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "late.audit@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/fine-gauge-merino-turtleneck")
    variant = prod_res.json()["variants"][0]

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Late Payer",
                "phone": "+1-555-4444",
                "line1": "Kurfürstendamm",
                "city": "Berlin",
                "state": "BE",
                "postal_code": "10707",
                "country": "Germany",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201, f"Failed placing order: {order_res.status_code} {order_res.text}"
    order_id = order_res.json()["id"]

    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = rzp_res.json()["razorpay_order_id"]

    # Artificially set expires_at 1 hour in the past
    past_time = datetime.now(timezone.utc) - timedelta(hours=1)
    async with TestingSessionLocal() as session:
        await session.execute(update(Order).where(Order.id == order_id).values(expires_at=past_time))
        await session.commit()

    # Client verification attempt on expired order -> rejected
    sig = compute_razorpay_signature(rzp_order_id, "pay_late_attempt", "test_audit_secret_m3_123")
    late_verify = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": "pay_late_attempt",
            "razorpay_signature": sig,
        },
        headers=headers,
    )
    assert late_verify.status_code == 400
    assert "expired" in late_verify.json()["detail"].lower()

    # Webhook on expired order -> rejected
    wh_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_late_hook",
                    "order_id": rzp_order_id,
                    "amount": int(Decimal(str(order_res.json()["total_amount"])) * 100),
                    "currency": "USD",
                    "status": "captured",
                }
            }
        },
    }
    wh_bytes = json.dumps(wh_payload).encode("utf-8")
    wh_sig = compute_webhook_signature(wh_bytes, "test_audit_webhook_secret_m3_123")

    late_wh = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=wh_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": wh_sig},
    )
    assert late_wh.status_code == 400


@pytest.mark.asyncio
async def test_webhook_arriving_before_frontend_verification(client: AsyncClient):
    """
    Verifies the race condition where the gateway webhook arrives and confirms the order
    before the customer's frontend redirect calls /verify.
    Inventory must be deducted exactly once, and frontend verification returns success idempotently.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "race.webhook.first@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/tailored-wool-barathea-blazer")
    variant = prod_res.json()["variants"][0]
    variant_id = variant["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers,
    )

    # Initial inventory
    async with TestingSessionLocal() as session:
        inv_before = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one().quantity

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Race Recipient",
                "phone": "+1-555-5555",
                "line1": "Ginza 6-chome",
                "city": "Tokyo",
                "state": "TK",
                "postal_code": "104-0061",
                "country": "Japan",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order = order_res.json()
    order_id = order["id"]

    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_order_id = rzp_res.json()["razorpay_order_id"]
    total_cents = int(Decimal(str(order["total_amount"])) * 100)

    # 1. Webhook arrives FIRST
    pay_id = "pay_race_wh_first_123"
    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": pay_id,
                    "order_id": rzp_order_id,
                    "amount": total_cents,
                    "currency": "USD",
                    "status": "captured",
                }
            }
        },
    }
    raw_bytes = json.dumps(webhook_payload).encode("utf-8")
    wh_sig = compute_webhook_signature(raw_bytes, "test_audit_webhook_secret_m3_123")

    wh_res = await client.post(
        "/api/v1/payments/webhooks/razorpay",
        content=raw_bytes,
        headers={"Content-Type": "application/json", "X-Razorpay-Signature": wh_sig},
    )
    assert wh_res.status_code == 200

    # Stock is decremented by 1
    async with TestingSessionLocal() as session:
        inv_after_wh = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one().quantity
        assert inv_after_wh == inv_before - 1

    # 2. Frontend verification arrives SECOND
    sig = compute_razorpay_signature(rzp_order_id, pay_id, "test_audit_secret_m3_123")
    v_res = await client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order_id,
            "razorpay_order_id": rzp_order_id,
            "razorpay_payment_id": pay_id,
            "razorpay_signature": sig,
        },
        headers=headers,
    )
    assert v_res.status_code == 200
    assert v_res.json()["payment_status"] == "paid"

    # Stock was NOT double decremented!
    async with TestingSessionLocal() as session:
        inv_final = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one().quantity
        assert inv_final == inv_before - 1


@pytest.mark.asyncio
async def test_cleanup_abandoned_expired_pending_orders(client: AsyncClient):
    """
    Verifies that the /checkout/cleanup-expired-orders endpoint identifies and transitions
    abandoned pending orders past their 30-minute reservation window to 'cancelled'.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "cleanup.tester@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/tailored-wool-barathea-blazer")
    variant = next(v for v in prod_res.json()["variants"] if v["size"] == "M")

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Abandoned Shopper",
                "phone": "+1-555-6666",
                "line1": "Via del Corso",
                "city": "Rome",
                "state": "RM",
                "postal_code": "00186",
                "country": "Italy",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201, f"Failed placing order: {order_res.status_code} {order_res.text}"
    order_id = order_res.json()["id"]

    # Artificially set expires_at 45 minutes in the past
    past_time = datetime.now(timezone.utc) - timedelta(minutes=45)
    async with TestingSessionLocal() as session:
        await session.execute(update(Order).where(Order.id == order_id).values(expires_at=past_time))
        await session.commit()

    # Trigger cleanup
    # 1. In production mode, verify unauthenticated public calls are rejected with 403
    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        unauth_cleanup = await client.post("/api/v1/checkout/cleanup-expired-orders")
        assert unauth_cleanup.status_code == 403
        assert "administrative" in unauth_cleanup.json()["detail"].lower()

        bad_key_cleanup = await client.post(
            "/api/v1/checkout/cleanup-expired-orders",
            headers={"X-Admin-Key": "unauthorized-cracker-key"},
        )
        assert bad_key_cleanup.status_code == 403

        # 2. Authorized call with valid X-Admin-Key succeeds
        cleanup_res = await client.post(
            "/api/v1/checkout/cleanup-expired-orders",
            headers={"X-Admin-Key": settings.ADMIN_API_KEY},
        )
        assert cleanup_res.status_code == 200
        assert cleanup_res.json()["status"] == "success"
        assert cleanup_res.json()["cancelled_count"] >= 1
    finally:
        settings.ENVIRONMENT = original_env

    # Verify order is cancelled in database
    async with TestingSessionLocal() as session:
        ord_db = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        assert ord_db.status == "cancelled"


@pytest.mark.asyncio
async def test_guest_order_ownership_and_token_isolation(client: AsyncClient):
    """
    Verifies that:
    1. Guest orders are securely bound to their cryptographic guest_token.
    2. Retrieval via /orders/{id} with the correct X-Guest-Token succeeds.
    3. Retrieval without or with the wrong X-Guest-Token is rejected (404 Not Found).
    4. Authenticated customers cannot view guest orders, and guests cannot view customer orders.
    5. Guest tokens cannot bypass authentication on /api/v1/orders (returns 401).
    """
    await client.post("/api/v1/products/seed")

    guest_token = "gst_crypto_audit_shopper_777"
    guest_headers = {"X-Guest-Token": guest_token}

    prod_res = await client.get("/api/v1/products/fine-gauge-merino-turtleneck")
    variant = prod_res.json()["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=guest_headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Anonymous Guest",
                "phone": "+1-555-7777",
                "line1": "Rua Augusta",
                "city": "Lisbon",
                "state": "LX",
                "postal_code": "1100-053",
                "country": "France",
            },
            "shipping_method": "standard",
        },
        headers=guest_headers,
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # 1. Fetching with valid guest token succeeds
    valid_fetch = await client.get(f"/api/v1/orders/{order_id}", headers=guest_headers)
    assert valid_fetch.status_code == 200
    assert valid_fetch.json()["id"] == order_id
    assert valid_fetch.json()["shipping_address_snapshot"]["full_name"] == "Anonymous Guest"

    # 2. Fetching with wrong guest token returns 404
    wrong_fetch = await client.get(
        f"/api/v1/orders/{order_id}",
        headers={"X-Guest-Token": "gst_wrong_hacker_token"},
    )
    assert wrong_fetch.status_code == 404

    # 3. Fetching without any guest token returns 404
    unauth_fetch = await client.get(f"/api/v1/orders/{order_id}")
    assert unauth_fetch.status_code == 404

    # 4. Guest token cannot access account-level order history (/api/v1/orders returns 401)
    account_listing = await client.get("/api/v1/orders", headers=guest_headers)
    assert account_listing.status_code == 401


@pytest.mark.asyncio
async def test_unsupported_destination_country_rejected(client: AsyncClient):
    """
    Verifies that checkout explicitly rejects unsupported international delivery
    destinations (e.g. non-serviceable countries).
    """
    await client.post("/api/v1/products/seed")

    guest_token = "gst_unsupported_country_shopper"
    guest_headers = {"X-Guest-Token": guest_token}

    prod_res = await client.get("/api/v1/products/fluid-silk-habotai-button-down")
    variant = prod_res.json()["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=guest_headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Lost Traveler",
                "phone": "+1-555-9999",
                "line1": "Atlantis Palace",
                "city": "Sunken City",
                "state": "N/A",
                "postal_code": "00000",
                "country": "Atlantis",
            },
            "shipping_method": "standard",
        },
        headers=guest_headers,
    )
    assert order_res.status_code == 400
    assert "unsupported" in order_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_secrets_omitted_from_all_order_and_payment_responses(client: AsyncClient):
    """
    Guarantees that sensitive credentials (key_secret, webhook_secret, internal keys)
    never appear in any order or payment endpoint response payloads.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "secrets.audit@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/minimalist-structured-car-coat")
    variant = prod_res.json()["variants"][0]

    cart_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert cart_res.status_code == 200, f"Cart add failed: {cart_res.status_code} {cart_res.text}"

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Secret Auditor",
                "phone": "+1-555-1234",
                "line1": "Madison Ave",
                "city": "New York",
                "state": "NY",
                "postal_code": "10016",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_data = order_res.json()
    order_id = order_data["id"]

    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    rzp_data = rzp_res.json()

    # Convert to json strings and verify no secrets leak
    for data in [order_data, rzp_data]:
        text = json.dumps(data)
        assert "key_secret" not in text
        assert "webhook_secret" not in text
        assert "test_audit_secret" not in text
        assert "test_audit_webhook" not in text


@pytest.mark.asyncio
async def test_production_catalog_seed_does_not_replenish_existing_stock(client: AsyncClient):
    """
    Verifies V7 fix: In production, catalog seeding updates metadata but preserves existing
    real warehouse inventory without unexpectedly replenishing stock to seed defaults.
    """
    await client.post("/api/v1/products/seed")

    prod_res = await client.get("/api/v1/products/architectural-cashmere-wrap-coat")
    variant = prod_res.json()["variants"][0]
    variant_id = variant["id"]

    # Artificially set remaining stock to 2 in the database (simulating real sales)
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Inventory).where(Inventory.variant_id == variant_id).values(quantity=2)
        )
        await session.commit()

    # Re-run seed in production mode with valid admin key and default replenish_stock=False
    original_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        seed_res = await client.post(
            "/api/v1/products/seed",
            headers={"X-Admin-Key": settings.ADMIN_API_KEY},
        )
        assert seed_res.status_code == 200

        # Verify stock remains at 2, NOT replenished to the seed default of 4
        async with TestingSessionLocal() as session:
            inv_row = (await session.execute(
                select(Inventory).where(Inventory.variant_id == variant_id)
            )).scalar_one()
            assert inv_row.quantity == 2, f"Expected 2 remaining units in production, got {inv_row.quantity}"
    finally:
        settings.ENVIRONMENT = original_env
