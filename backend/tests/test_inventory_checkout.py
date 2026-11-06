"""
DRAPE Inventory Integrity & Concurrency Checkout Test Suite.

Verifies:
1. Concurrent payment verification attempts on the last remaining stock unit.
2. Prevention of overselling (stock never drops below zero).
3. Exactly one payment verification succeeds; rival order fails with 409 Conflict.
4. Abandoned/expired pending orders are rejected and marked cancelled.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.api.deps import set_payment_gateway
from app.core.config import settings
from app.domain.models.catalog import Inventory
from app.domain.models.order import Order
from app.infrastructure.adapters.razorpay_payment_adapter import RazorpayPaymentAdapter
from tests.conftest import TestingSessionLocal
from tests.test_payments import compute_razorpay_signature


@pytest.fixture(autouse=True)
def setup_gateway():
    """Sets up a test payment gateway adapter."""
    adapter = RazorpayPaymentAdapter(
        key_id="rzp_test_mock_concurrency",
        key_secret="test_secret_concurrency",
        webhook_secret="test_webhook_concurrency",
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
async def test_concurrent_payment_verification_prevents_overselling(client: AsyncClient):
    """
    Spawns concurrent checkout confirmations for the last available unit of stock.
    Verifies that only 1 order captures the unit, and the other receives 409 Conflict.
    Stock remains at exactly 0, never negative.
    """
    await client.post("/api/v1/products/seed")

    # Register Customer 1
    res1 = await client.post(
        "/api/v1/auth/register",
        json={"email": "concur1@drape.fashion", "password": "Password123!"},
    )
    token1 = res1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    # Register Customer 2
    res2 = await client.post(
        "/api/v1/auth/register",
        json={"email": "concur2@drape.fashion", "password": "Password123!"},
    )
    token2 = res2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # Target product variant
    prod_res = await client.get("/api/v1/products/chunky-ribbed-fisherman-sweater")
    product = prod_res.json()
    variant = product["variants"][0]
    variant_id = variant["id"]

    # Set inventory to 2 in the database so both can add 1 unit to cart and place orders
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Inventory)
            .where(Inventory.variant_id == variant_id)
            .values(quantity=2)
        )
        await session.commit()

    # Both customers add 1 item to their cart
    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers1,
    )
    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=headers2,
    )

    # Both place pending orders while stock is 2
    addr_payload = {
        "shipping_address": {
            "full_name": "Rival Shopper",
            "phone": "+1-555-1234",
            "line1": "Rodeo Dr",
            "city": "Beverly Hills",
            "state": "CA",
            "postal_code": "90210",
            "country": "United States",
        },
        "shipping_method": "standard",
    }
    order_res1 = await client.post("/api/v1/checkout/orders", json=addr_payload, headers=headers1)
    assert order_res1.status_code == 201
    order1 = order_res1.json()

    order_res2 = await client.post("/api/v1/checkout/orders", json=addr_payload, headers=headers2)
    assert order_res2.status_code == 201
    order2 = order_res2.json()

    # Now simulate warehouse stock dropping to 1 before payment verification
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Inventory)
            .where(Inventory.variant_id == variant_id)
            .values(quantity=1)
        )
        await session.commit()

    # Create gateway sessions
    rzp_res1 = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order1["id"]},
        headers=headers1,
    )
    rzp_res2 = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order2["id"]},
        headers=headers2,
    )
    rzp_data1 = rzp_res1.json()
    rzp_data2 = rzp_res2.json()

    sig1 = compute_razorpay_signature(rzp_data1["razorpay_order_id"], "pay_rival_1", "test_secret_concurrency")
    sig2 = compute_razorpay_signature(rzp_data2["razorpay_order_id"], "pay_rival_2", "test_secret_concurrency")

    # Fire concurrent payment verification requests simultaneously
    verify_task1 = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order1["id"],
            "razorpay_order_id": rzp_data1["razorpay_order_id"],
            "razorpay_payment_id": "pay_rival_1",
            "razorpay_signature": sig1,
        },
        headers=headers1,
    )
    verify_task2 = client.post(
        "/api/v1/payments/razorpay/verify",
        json={
            "order_id": order2["id"],
            "razorpay_order_id": rzp_data2["razorpay_order_id"],
            "razorpay_payment_id": "pay_rival_2",
            "razorpay_signature": sig2,
        },
        headers=headers2,
    )

    resp1, resp2 = await asyncio.gather(verify_task1, verify_task2)

    status_codes = {resp1.status_code, resp2.status_code}
    # Exactly one must succeed (200) and one must be rejected (409)
    assert 200 in status_codes, f"Expected a 200 OK, got {resp1.status_code} and {resp2.status_code}"
    assert 409 in status_codes, f"Expected a 409 Conflict, got {resp1.status_code} and {resp2.status_code}"

    # Verify inventory is strictly 0 and NOT negative
    async with TestingSessionLocal() as session:
        inv_check = await session.execute(
            select(Inventory).where(Inventory.variant_id == variant_id)
        )
        assert inv_check.scalar_one().quantity == 0


@pytest.mark.asyncio
async def test_pending_order_expiration_rejected(client: AsyncClient):
    """Verifies that expired pending orders cannot be paid and transition to cancelled."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "expired.order@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_res = await client.get("/api/v1/products/fine-gauge-merino-turtleneck")
    variant = prod_res.json()["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Late Shopper",
                "phone": "+1-555-5555",
                "line1": "Via Montenapoleone",
                "city": "Milan",
                "state": "MI",
                "postal_code": "20121",
                "country": "Italy",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    order_id = order_res.json()["id"]

    # Artificially set expires_at in the past
    past_time = datetime.now(timezone.utc) - timedelta(minutes=45)
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Order)
            .where(Order.id == order_id)
            .values(expires_at=past_time)
        )
        await session.commit()

    # Attempt to create Razorpay session on expired order
    rzp_res = await client.post(
        "/api/v1/payments/razorpay/create",
        json={"order_id": order_id},
        headers=headers,
    )
    assert rzp_res.status_code == 400
    assert "expired" in rzp_res.json()["detail"].lower()

    # Check order was transitioned to cancelled
    async with TestingSessionLocal() as session:
        order_check = await session.execute(
            select(Order).where(Order.id == order_id)
        )
        assert order_check.scalar_one().status == "cancelled"
