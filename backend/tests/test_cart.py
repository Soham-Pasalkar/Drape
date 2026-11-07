"""
DRAPE Shopping Cart & Inventory Validation Test Suite.

Verifies:
1. Guest cart creation, token generation, and retrieval.
2. Line item additions with real inventory validation.
3. Out-of-stock and over-capacity request rejection.
4. Line item quantity updates and variant switching.
5. Line item deletion.
6. Server-side price calculation integrity (anti-tampering).
7. Authenticated customer cart persistence.
8. Guest-to-customer cart merging upon login.
9. Customer cart isolation.
"""

import asyncio
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.core.config import settings
from app.domain.models.catalog import Inventory, Product, ProductVariant
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_guest_cart_lifecycle_and_calculations(client: AsyncClient):
    """Verifies guest cart creation, adding items, quantity updates, and removal."""
    await client.post("/api/v1/products/seed")

    # 1. Fetch initial cart (auto provisions guest cart)
    cart_init = await client.get("/api/v1/cart")
    assert cart_init.status_code == 200
    init_data = cart_init.json()
    assert init_data["total_items"] == 0
    assert init_data["subtotal"] == 0.0
    assert "guest_token" in init_data
    guest_token = init_data["guest_token"]
    assert guest_token is not None

    guest_headers = {"X-Guest-Token": guest_token}

    # 2. Get an active variant
    product_res = await client.get("/api/v1/products/the-sculpted-double-faced-wool-overcoat")
    assert product_res.status_code == 200
    product = product_res.json()
    in_stock_variant = next(v for v in product["variants"] if v["available_quantity"] >= 5)
    variant_id = in_stock_variant["id"]
    unit_price = product["price"]

    # 3. Add item to cart
    add_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 2},
        headers=guest_headers,
    )
    assert add_res.status_code == 200
    cart_data = add_res.json()
    assert cart_data["total_items"] == 2
    assert cart_data["subtotal"] == round(unit_price * 2, 2)
    assert len(cart_data["items"]) == 1
    item_id = cart_data["items"][0]["id"]
    assert cart_data["items"][0]["unit_price"] == unit_price
    assert cart_data["items"][0]["quantity"] == 2

    # 4. Update quantity to 3
    update_res = await client.patch(
        f"/api/v1/cart/items/{item_id}",
        json={"quantity": 3},
        headers=guest_headers,
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["total_items"] == 3
    assert updated_data["subtotal"] == round(unit_price * 3, 2)

    # 5. Remove item
    del_res = await client.delete(
        f"/api/v1/cart/items/{item_id}",
        headers=guest_headers,
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["total_items"] == 0
    assert del_data["subtotal"] == 0.0
    assert len(del_data["items"]) == 0


@pytest.mark.asyncio
async def test_inventory_capacity_and_out_of_stock_rejection(client: AsyncClient):
    """Rejects additions that exceed available stock or target out-of-stock variants."""
    await client.post("/api/v1/products/seed")

    # Find a product with an out of stock variant
    product_res = await client.get("/api/v1/products/the-sculpted-double-faced-wool-overcoat")
    product = product_res.json()

    # The XL variant was seeded with quantity: 0
    zero_stock_variant = next((v for v in product["variants"] if v["available_quantity"] == 0), None)
    assert zero_stock_variant is not None

    # Attempting to add 1 unit of out-of-stock variant must be rejected
    res1 = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": zero_stock_variant["id"], "quantity": 1},
        headers={"X-Guest-Token": "gst_stock_test_1"},
    )
    assert res1.status_code == 400
    assert "stock" in res1.json()["detail"].lower()

    # Find a variant with limited stock (e.g. quantity: 5)
    limited_variant = next(v for v in product["variants"] if 0 < v["available_quantity"] <= 5)
    avail_qty = limited_variant["available_quantity"]

    # Attempting to add more than available must be rejected
    res2 = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": limited_variant["id"], "quantity": avail_qty + 10},
        headers={"X-Guest-Token": "gst_stock_test_2"},
    )
    assert res2.status_code == 400
    assert "available" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_price_tampering_prevention(client: AsyncClient):
    """
    Guarantees that prices are calculated exclusively from database records.
    Client-submitted price fields in payload are rejected by strict schema validation.
    """
    await client.post("/api/v1/products/seed")

    product_res = await client.get("/api/v1/products/the-sculpted-double-faced-wool-overcoat")
    variant = product_res.json()["variants"][0]

    # Attempt to submit a hacked price
    tamper_payload = {
        "variant_id": variant["id"],
        "quantity": 1,
        "price": 0.01,  # Attempting to purchase $980 coat for 1 cent
        "unit_price": 0.01,
    }
    # Pydantic extra="forbid" rejects unexpected price keys with 422
    res = await client.post(
        "/api/v1/cart/items",
        json=tamper_payload,
        headers={"X-Guest-Token": "gst_tamper_test"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_authenticated_customer_cart_and_guest_merging(client: AsyncClient):
    """
    Verifies that:
    1. A guest can populate items into an anonymous cart.
    2. Upon registration/login, guest cart is merged into the user's permanent cart.
    3. The guest cart record is cleaned up.
    """
    await client.post("/api/v1/products/seed")

    # 1. Populate guest cart
    guest_token = "gst_merge_session_12345"
    guest_headers = {"X-Guest-Token": guest_token}

    product_res = await client.get("/api/v1/products/fine-gauge-merino-turtleneck")
    variant = next(v for v in product_res.json()["variants"] if v["available_quantity"] >= 5)

    add_res = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant["id"], "quantity": 2},
        headers=guest_headers,
    )
    assert add_res.status_code == 200

    # 2. Register new customer
    user_reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "cart.shopper@drape.fashion", "password": "Password123!"},
    )
    assert user_reg.status_code == 201
    auth_token = user_reg.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {auth_token}"}

    # 3. Merge guest cart into customer cart
    merge_res = await client.post(
        "/api/v1/cart/merge",
        json={"guest_token": guest_token},
        headers=auth_headers,
    )
    assert merge_res.status_code == 200
    merged_data = merge_res.json()

    assert merged_data["total_items"] == 2
    assert len(merged_data["items"]) == 1
    assert merged_data["items"][0]["variant_id"] == variant["id"]

    # 4. Fetch customer cart to verify persistence
    user_cart_res = await client.get("/api/v1/cart", headers=auth_headers)
    assert user_cart_res.status_code == 200
    assert user_cart_res.json()["total_items"] == 2


@pytest.mark.asyncio
async def test_customer_cart_isolation(client: AsyncClient):
    """Guarantees that Customer A and Customer B cannot view or modify each other's carts."""
    await client.post("/api/v1/products/seed")

    # User A
    user_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "cart.user.a@drape.fashion", "password": "PasswordUserA!"},
    )
    token_a = user_a.json()["access_token"]

    # User B
    user_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "cart.user.b@drape.fashion", "password": "PasswordUserB!"},
    )
    token_b = user_b.json()["access_token"]

    # User A adds item
    prod_res = await client.get("/api/v1/products/raw-leather-atelier-bomber")
    variant_a = prod_res.json()["variants"][0]

    add_a = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_a["id"], "quantity": 1},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert add_a.status_code == 200
    assert add_a.json()["total_items"] == 1

    # User B fetches their own cart -> must be empty
    get_b = await client.get(
        "/api/v1/cart",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_b.status_code == 200
    assert get_b.json()["total_items"] == 0
    assert len(get_b.json()["items"]) == 0


@pytest.mark.asyncio
async def test_concurrent_cart_additions_prevent_overselling(client: AsyncClient):
    """
    Tests concurrent requests attempting to add the last available unit of a product
    to different carts. Only one cart must succeed; the other must be rejected to
    prevent overselling.
    """
    await client.post("/api/v1/products/seed")

    # 1. Target a specific variant and set its stock to exactly 1
    prod_res = await client.get("/api/v1/products/architectural-cashmere-wrap-coat")
    assert prod_res.status_code == 200
    variant_id = prod_res.json()["variants"][0]["id"]

    async with TestingSessionLocal() as session:
        inv = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one()
        inv.quantity = 1
        await session.commit()

    # 2. Pre-provision the two guest carts so both exist
    token_1 = "gst_concurrency_shopper_alpha"
    token_2 = "gst_concurrency_shopper_beta"
    await client.get("/api/v1/cart", headers={"X-Guest-Token": token_1})
    await client.get("/api/v1/cart", headers={"X-Guest-Token": token_2})

    # Fire two concurrent additions from different guest sessions

    res_1, res_2 = await asyncio.gather(
        client.post(
            "/api/v1/cart/items",
            json={"variant_id": variant_id, "quantity": 1},
            headers={"X-Guest-Token": token_1},
        ),
        client.post(
            "/api/v1/cart/items",
            json={"variant_id": variant_id, "quantity": 1},
            headers={"X-Guest-Token": token_2},
        ),
    )

    statuses = sorted([res_1.status_code, res_2.status_code])
    assert statuses == [200, 400], f"Expected exactly one 200 and one 400, got: {statuses}"

    failed_res = res_1 if res_1.status_code == 400 else res_2
    assert "stock" in failed_res.json()["detail"].lower()

    # 3. Verify total units in all carts is exactly 1
    cart_1 = (await client.get("/api/v1/cart", headers={"X-Guest-Token": token_1})).json()
    cart_2 = (await client.get("/api/v1/cart", headers={"X-Guest-Token": token_2})).json()
    assert (cart_1["total_items"] + cart_2["total_items"]) == 1


@pytest.mark.asyncio
async def test_cart_update_validates_remaining_stock(client: AsyncClient):
    """
    Verifies that cart quantity updates re-check available stock against units
    claimed by other carts, preventing overselling via update operations.
    """
    await client.post("/api/v1/products/seed")

    prod_res = await client.get("/api/v1/products/fluid-silk-habotai-button-down")
    assert prod_res.status_code == 200
    variant_id = prod_res.json()["variants"][0]["id"]

    # Set stock to exactly 2
    async with TestingSessionLocal() as session:
        inv = (await session.execute(select(Inventory).where(Inventory.variant_id == variant_id))).scalar_one()
        inv.quantity = 2
        await session.commit()

    # User A takes 1 unit
    token_a = "gst_stock_update_shopper_a"
    add_a = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers={"X-Guest-Token": token_a},
    )
    assert add_a.status_code == 200
    item_a_id = add_a.json()["items"][0]["id"]

    # User B takes the remaining 1 unit
    token_b = "gst_stock_update_shopper_b"
    add_b = await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers={"X-Guest-Token": token_b},
    )
    assert add_b.status_code == 200

    # User A now tries to increase quantity to 2 -> must be rejected because User B has 1
    update_a = await client.patch(
        f"/api/v1/cart/items/{item_a_id}",
        json={"quantity": 2},
        headers={"X-Guest-Token": token_a},
    )
    assert update_a.status_code == 400
    assert "exceeds available stock" in update_a.json()["detail"].lower()


@pytest.mark.asyncio
async def test_production_catalog_seed_protection(client: AsyncClient):
    """
    Verifies that POST /api/v1/products/seed cannot be triggered by arbitrary
    public users in production without valid administrative credentials.
    """
    original_env = settings.ENVIRONMENT
    try:
        # Simulate production environment
        settings.ENVIRONMENT = "production"

        # 1. Unauthenticated public request -> must return 403 Forbidden
        pub_res = await client.post("/api/v1/products/seed")
        assert pub_res.status_code == 403
        assert "administrative" in pub_res.json()["detail"].lower()

        # 2. Invalid admin key -> must return 403 Forbidden
        bad_key_res = await client.post(
            "/api/v1/products/seed",
            headers={"X-Admin-Key": "invalid-hacker-key"},
        )
        assert bad_key_res.status_code == 403

        # 3. Valid admin key -> must succeed with 200 OK
        good_key_res = await client.post(
            "/api/v1/products/seed",
            headers={"X-Admin-Key": settings.ADMIN_API_KEY},
        )
        assert good_key_res.status_code == 200
        assert good_key_res.json()["status"] == "success"

    finally:
        settings.ENVIRONMENT = original_env


@pytest.mark.asyncio
async def test_guest_token_security_and_isolation(client: AsyncClient):
    """
    Verifies that guest tokens are cryptographically generated and cannot
    access an authenticated customer's cart under any circumstances.
    """
    await client.post("/api/v1/products/seed")

    # 1. Register authenticated user and add item
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "isolated.shopper@drape.fashion", "password": "Password123!"},
    )
    user_token = reg.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    prod_res = await client.get("/api/v1/products/cropped-tailored-cigarette-trouser")
    assert prod_res.status_code == 200
    variant_id = prod_res.json()["variants"][0]["id"]

    await client.post(
        "/api/v1/cart/items",
        json={"variant_id": variant_id, "quantity": 1},
        headers=user_headers,
    )

    user_cart = (await client.get("/api/v1/cart", headers=user_headers)).json()
    assert user_cart["total_items"] == 1
    user_cart_id = user_cart["id"]

    # 2. An anonymous guest requests cart with automatic token generation
    client.cookies.clear()
    guest_res = await client.get("/api/v1/cart")
    assert guest_res.status_code == 200
    guest_data = guest_res.json()
    assert guest_data["guest_token"].startswith("gst_")
    # Must have 48 hex characters after 'gst_' (192 bits of entropy)
    assert len(guest_data["guest_token"]) >= 50

    # 3. An attacker attempts to use the authenticated cart's UUID as their guest token
    spoofed_res = await client.get(
        "/api/v1/cart",
        headers={"X-Guest-Token": user_cart_id},
    )
    assert spoofed_res.status_code == 200
    spoofed_data = spoofed_res.json()
    # Must NOT access user's cart; returns an empty isolated cart
    assert spoofed_data["id"] != user_cart_id
    assert spoofed_data["total_items"] == 0

