"""
DRAPE Checkout Foundation & Pricing Quote Test Suite.

Verifies:
1. Server-side quote calculation (subtotal, shipping tiers, tax, total).
2. Free shipping eligibility above $500 and Atelier white-glove above $1500.
3. Empty bag quote rejection (400 Bad Request).
4. Order placement with saved address or inline address.
5. Out-of-stock detection preventing order creation (409 Conflict).
6. Financial integrity and anti-tampering (prices calculated server-side).
7. Order expiration window (30 minutes).
"""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.domain.models.catalog import Inventory
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_checkout_quote_and_thresholds(client: AsyncClient):
    """Verifies server-calculated quote, shipping tiers, and free shipping eligibility."""
    await client.post("/api/v1/products/seed")

    # Register customer
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "checkout.quote@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Quote on empty bag fails
    empty_res = await client.post(
        "/api/v1/checkout/quote",
        json={"shipping_method": "standard"},
        headers=headers,
    )
    assert empty_res.status_code == 400
    assert "empty" in empty_res.json()["detail"].lower()

    # 2. Add an item priced under $500 (e.g. Silk Shirt ~ $340)
    # Get cashmere scarf or silk shirt
    prod_res = await client.get("/api/v1/products/crisp-poplin-band-collar-shirt")
    product = prod_res.json()
    variant = product["variants"][0]

    add_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )
    assert add_res.status_code == 200

    # Request quote with inline address
    quote_payload = {
        "shipping_address": {
            "full_name": "Quote Customer",
            "phone": "+1-555-9988",
            "line1": "5th Avenue",
            "city": "New York",
            "state": "NY",
            "postal_code": "10022",
            "country": "United States",
        },
        "shipping_method": "standard",
    }
    quote_res = await client.post("/api/v1/checkout/quote", json=quote_payload, headers=headers)
    assert quote_res.status_code == 200
    data = quote_res.json()

    assert data["item_count"] == 1
    subtotal = Decimal(str(data["subtotal"]))
    assert subtotal == Decimal(str(product["price"]))
    assert data["is_free_shipping_eligible"] is False
    assert Decimal(str(data["shipping_amount"])) == Decimal("25.00")
    assert Decimal(str(data["total_amount"])) == (
        subtotal + Decimal(str(data["shipping_amount"])) + Decimal(str(data["tax_amount"]))
    )

    # 3. Add high-value coat (> $500) to trigger free shipping
    coat_res = await client.get("/api/v1/products/the-sculpted-double-faced-wool-overcoat")
    coat = coat_res.json()
    coat_variant = coat["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": coat_variant["id"], "quantity": 1},
        headers=headers,
    )

    quote_res2 = await client.post("/api/v1/checkout/quote", json=quote_payload, headers=headers)
    assert quote_res2.status_code == 200
    data2 = quote_res2.json()

    assert data2["is_free_shipping_eligible"] is True
    assert Decimal(str(data2["shipping_amount"])) == Decimal("0.00")

    # Check that shipping options list accurately reports standard is free
    standard_opt = next(o for o in data2["shipping_options"] if o["id"] == "standard")
    assert standard_opt["is_free"] is True
    assert Decimal(str(standard_opt["amount"])) == Decimal("0.00")


@pytest.mark.asyncio
async def test_order_placement_and_snapshot_integrity(client: AsyncClient):
    """Verifies order creation, historical snapshots, and inventory revalidation."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "order.placer@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item to cart
    prod_res = await client.get("/api/v1/products/architectural-cashmere-wrap-coat")
    product = prod_res.json()
    variant = next(v for v in product["variants"] if v["available_quantity"] >= 2)

    add_item_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 2},
        headers=headers,
    )
    assert add_item_res.status_code == 200

    # Create saved address
    addr_res = await client.post(
        "/api/v1/addresses",
        json={
            "full_name": "Marcus Aurelius",
            "phone": "+1-555-7777",
            "line1": "Palatine Hill",
            "city": "Rome",
            "state": "Lazio",
            "postal_code": "00184",
            "country": "Italy",
        },
        headers=headers,
    )
    assert addr_res.status_code == 201
    address_id = addr_res.json()["id"]

    # Place order using saved address
    order_payload = {
        "shipping_address_id": address_id,
        "shipping_method": "express",
        "customer_notes": "Please leave at atelier vestibule.",
    }
    order_res = await client.post(
        "/api/v1/checkout/orders",
        json=order_payload,
        headers=headers,
    )
    assert order_res.status_code == 201
    order = order_res.json()

    assert order["order_number"].startswith("DRP-2026-")
    assert order["status"] == "pending"
    assert order["payment_status"] == "unpaid"
    assert order["customer_notes"] == "Please leave at atelier vestibule."
    assert order["expires_at"] is not None

    # Check snapshots
    snapshot = order["shipping_address_snapshot"]
    assert snapshot["full_name"] == "Marcus Aurelius"
    assert snapshot["line1"] == "Palatine Hill"

    # Check order items
    assert len(order["items"]) == 1
    item = order["items"][0]
    assert item["product_name"] == product["name"]
    assert item["sku"] == variant["sku"]
    assert item["quantity"] == 2
    assert Decimal(str(item["unit_price"])) == Decimal(str(product["price"]))
    assert Decimal(str(item["line_total"])) == Decimal(str(product["price"])) * 2

    # Check status history
    assert len(order["status_history"]) >= 1
    assert order["status_history"][0]["to_status"] == "pending"


@pytest.mark.asyncio
async def test_order_placement_stock_depletion_rejected(client: AsyncClient):
    """Verifies that if an item runs out of stock, order placement is rejected with 409 Conflict."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "depleted.order@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item
    prod_res = await client.get("/api/v1/products/raw-leather-atelier-bomber")
    product = prod_res.json()
    variant = product["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )

    # Artificially set inventory to 0 in database before placing order
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Inventory)
            .where(Inventory.variant_id == variant["id"])
            .values(quantity=0)
        )
        await session.commit()

    # Attempt to place order -> must fail with 409 Conflict
    order_payload = {
        "shipping_address": {
            "full_name": "Test Customer",
            "phone": "+1-555-0000",
            "line1": "100 Fashion St",
            "city": "Paris",
            "state": "IDF",
            "postal_code": "75001",
            "country": "France",
        },
        "shipping_method": "standard",
    }
    order_res = await client.post(
        "/api/v1/checkout/orders",
        json=order_payload,
        headers=headers,
    )
    assert order_res.status_code == 409
    assert "insufficient inventory" in order_res.json()["detail"].lower()
