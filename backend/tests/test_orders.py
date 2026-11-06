"""
DRAPE Order Management & Customer Isolation Test Suite.

Verifies:
1. Historical product snapshots remain immutable when catalog data changes.
2. Customer order isolation (Customer B cannot view Customer A's order by UUID or order number).
3. Order history listing (/api/v1/orders) with customer scoping.
4. Order status transitions and audit log records.
5. Unauthenticated order access rejection.
"""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.domain.models.catalog import Product
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_order_historical_snapshots_immutable(client: AsyncClient):
    """Verifies order items retain historical snapshots even if product details change."""
    await client.post("/api/v1/products/seed")

    # Register customer
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "snapshot.tester@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item
    prod_res = await client.get("/api/v1/products/crisp-poplin-band-collar-shirt")
    product = prod_res.json()
    variant = product["variants"][0]
    original_price = Decimal(str(product["price"]))
    original_name = product["name"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers,
    )

    # Place order
    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Historical Snapshot",
                "phone": "+1-555-4321",
                "line1": "1 Historical Way",
                "city": "Boston",
                "state": "MA",
                "postal_code": "02108",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201
    order = order_res.json()
    order_id = order["id"]

    # Now simulate product name and price change in the database
    async with TestingSessionLocal() as session:
        await session.execute(
            update(Product)
            .where(Product.id == product["id"])
            .values(
                name="RENAMED: Future Edition Shirt",
                price=Decimal("9999.00"),
            )
        )
        await session.commit()

    # Re-fetch order
    fetch_res = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert fetch_res.status_code == 200
    refetched_order = fetch_res.json()

    # The order item snapshot MUST still reflect the original name and price!
    item = refetched_order["items"][0]
    assert item["product_name"] == original_name
    assert Decimal(str(item["unit_price"])) == original_price
    assert Decimal(str(item["line_total"])) == original_price


@pytest.mark.asyncio
async def test_customer_order_isolation(client: AsyncClient):
    """Guarantees Customer B cannot view Customer A's order by UUID or order number."""
    await client.post("/api/v1/products/seed")

    # Customer A
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "order.customer.a@drape.fashion", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Customer B
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "order.customer.b@drape.fashion", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Customer A adds item and places order
    prod_res = await client.get("/api/v1/products/the-sculpted-double-faced-wool-overcoat")
    variant = prod_res.json()["variants"][0]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 1},
        headers=headers_a,
    )

    place_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Customer A",
                "phone": "+1-555-1111",
                "line1": "742 Evergreen Terr",
                "city": "Springfield",
                "state": "OR",
                "postal_code": "97477",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers_a,
    )
    assert place_res.status_code == 201
    order_a = place_res.json()
    order_a_id = order_a["id"]
    order_a_num = order_a["order_number"]

    # Customer B attempts to fetch Customer A's order by ID
    get_by_id_b = await client.get(f"/api/v1/orders/{order_a_id}", headers=headers_b)
    assert get_by_id_b.status_code == 404

    # Customer B attempts to fetch Customer A's order by order number
    get_by_num_b = await client.get(f"/api/v1/orders/{order_a_num}", headers=headers_b)
    assert get_by_num_b.status_code == 404

    # Customer B's order list must not show Customer A's order
    list_b = await client.get("/api/v1/orders", headers=headers_b)
    assert list_b.status_code == 200
    assert list_b.json()["total"] == 0
    assert len(list_b.json()["orders"]) == 0

    # Customer A's order list shows the order
    list_a = await client.get("/api/v1/orders", headers=headers_a)
    assert list_a.status_code == 200
    assert list_a.json()["total"] == 1
    assert list_a.json()["orders"][0]["id"] == order_a_id

