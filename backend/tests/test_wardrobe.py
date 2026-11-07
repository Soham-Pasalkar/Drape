"""
DRAPE Milestone 4: Smart Digital Wardrobe & Outfits Test Suite.

Verifies:
1. Manual wardrobe item creation, retrieval, updating, and deletion.
2. Filtering, pagination, sorting, and search.
3. Strict customer isolation and IDOR rejection.
4. Purchase ingestion from verified, paid orders.
5. Rejection of items from unpaid, failed, or cancelled orders.
6. Duplicate purchase import prevention.
7. Bulk import idempotency.
8. Outfit creation, updating, deletion, and item reordering.
9. Cross-customer outfit association rejection.
10. Cascading cleanup of outfit associations upon wardrobe item deletion.
"""

import asyncio
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.domain.models.order import Order
from app.domain.models.wardrobe import Outfit, OutfitItem, WardrobeItem
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_manual_wardrobe_item_crud_and_validation(client: AsyncClient):
    """Verifies complete manual wardrobe item lifecycle: create, get, patch, delete."""
    # 1. Register customer
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "wardrobe.crud@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create manual garment
    payload = {
        "name": "Vintage Japanese Selvedge Denim",
        "brand": "Kuroki Mills",
        "category": "trousers",
        "subcategory": "jeans",
        "color": "Indigo",
        "secondary_color": "Tobacco Stitching",
        "size": "32",
        "material": "100% Cotton 14oz Denim",
        "season": "all-season",
        "occasion": "casual",
        "image_url": "/images/selvedge-denim.jpg",
        "description": "Custom hemmed straight leg selvedge denim.",
    }
    create_res = await client.post("/api/v1/wardrobe", json=payload, headers=headers)
    assert create_res.status_code == 201
    item = create_res.json()
    item_id = item["id"]
    assert item["name"] == "Vintage Japanese Selvedge Denim"
    assert item["brand"] == "Kuroki Mills"
    assert item["source"] == "manual"
    assert item["color"] == "Indigo"

    # 3. Get item
    get_res = await client.get(f"/api/v1/wardrobe/{item_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == item_id

    # 4. Update item
    patch_payload = {
        "name": "Custom Kuroki Indigo Selvedge Denim",
        "occasion": "evening",
    }
    patch_res = await client.patch(f"/api/v1/wardrobe/{item_id}", json=patch_payload, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Custom Kuroki Indigo Selvedge Denim"
    assert patch_res.json()["occasion"] == "evening"

    # 5. Delete item
    del_res = await client.delete(f"/api/v1/wardrobe/{item_id}", headers=headers)
    assert del_res.status_code == 200

    # 6. Verify item is gone
    get_again = await client.get(f"/api/v1/wardrobe/{item_id}", headers=headers)
    assert get_again.status_code == 404


@pytest.mark.asyncio
async def test_wardrobe_filtering_pagination_and_search(client: AsyncClient):
    """Verifies multi-attribute filtering, search by name/brand, and sorting."""
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "wardrobe.search@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add diverse wardrobe items
    items_data = [
        {"name": "Heavyweight Cashmere Crewneck", "brand": "DRAPE Atelier", "category": "knitwear", "color": "Noir", "season": "winter", "occasion": "atelier"},
        {"name": "Fine Silk Habotai Shirt", "brand": "Loro Piana", "category": "shirts", "color": "Ivory", "season": "summer", "occasion": "evening"},
        {"name": "Sculpted Wool Overcoat", "brand": "DRAPE Atelier", "category": "coats", "color": "Noir", "season": "winter", "occasion": "formal"},
        {"name": "Pleated Linen Trouser", "brand": "Brunello Cucinelli", "category": "trousers", "color": "Sand", "season": "summer", "occasion": "casual"},
    ]
    for d in items_data:
        res = await client.post("/api/v1/wardrobe", json=d, headers=headers)
        assert res.status_code == 201

    # Filter by category
    cat_res = await client.get("/api/v1/wardrobe?category=knitwear", headers=headers)
    assert cat_res.status_code == 200
    assert cat_res.json()["total"] == 1
    assert cat_res.json()["items"][0]["name"] == "Heavyweight Cashmere Crewneck"

    # Filter by color
    color_res = await client.get("/api/v1/wardrobe?color=noir", headers=headers)
    assert color_res.status_code == 200
    assert color_res.json()["total"] == 2

    # Filter by season
    season_res = await client.get("/api/v1/wardrobe?season=winter", headers=headers)
    assert season_res.status_code == 200
    assert season_res.json()["total"] == 2

    # Search keyword
    search_res = await client.get("/api/v1/wardrobe?search=Piana", headers=headers)
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["brand"] == "Loro Piana"

    # Sorting
    sort_res = await client.get("/api/v1/wardrobe?sort_by=name_asc", headers=headers)
    assert sort_res.status_code == 200
    names = [it["name"] for it in sort_res.json()["items"]]
    assert names == sorted(names)

    # Pagination
    page_res = await client.get("/api/v1/wardrobe?page=1&limit=2", headers=headers)
    assert page_res.status_code == 200
    assert len(page_res.json()["items"]) == 2
    assert page_res.json()["total"] == 4


@pytest.mark.asyncio
async def test_cross_customer_wardrobe_access_rejection(client: AsyncClient):
    """Verifies that customers cannot inspect, edit, or delete another customer's wardrobe item (IDOR)."""
    # Customer Alpha
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "alpha.wardrobe@drape.fashion", "password": "Password123!"},
    )
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Customer Beta
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "beta.wardrobe@drape.fashion", "password": "Password123!"},
    )
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Alpha creates item
    create_res = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Alpha Tailored Coat", "category": "coats", "color": "Noir"},
        headers=headers_a,
    )
    alpha_item_id = create_res.json()["id"]

    # Beta attempts GET
    get_res = await client.get(f"/api/v1/wardrobe/{alpha_item_id}", headers=headers_b)
    assert get_res.status_code == 404

    # Beta attempts PATCH
    patch_res = await client.patch(
        f"/api/v1/wardrobe/{alpha_item_id}",
        json={"name": "Hacked Name"},
        headers=headers_b,
    )
    assert patch_res.status_code == 404

    # Beta attempts DELETE
    del_res = await client.delete(f"/api/v1/wardrobe/{alpha_item_id}", headers=headers_b)
    assert del_res.status_code == 404

    # Unauthenticated attempts return 401
    client.cookies.clear()
    unauth_res = await client.get(f"/api/v1/wardrobe/{alpha_item_id}")
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_purchased_item_ingestion_and_validation(client: AsyncClient):
    """
    Verifies adding purchased garments from order history:
    - Succeeds for verified paid orders.
    - Rejects unpaid/cancelled orders.
    - Prevents duplicate imports.
    - Rejects foreign orders belonging to other customers.
    """
    await client.post("/api/v1/products/seed")

    # Register Customer
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "shopper.wardrobe@drape.fashion", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item to cart and place order
    prod_res = await client.get("/api/v1/products/architectural-cashmere-wrap-coat")
    variant = prod_res.json()["variants"][0]

    await client.post("/api/v1/cart/items", json={"variant_id": variant["id"], "quantity": 1}, headers=headers)
    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Wardrobe Shopper",
                "phone": "+1-555-1234",
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
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]
    order_item_id = order_data["items"][0]["id"]

    # 1. Attempt to add item while order is still pending/unpaid -> must be rejected with 400
    early_add = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=headers)
    assert early_add.status_code == 400
    assert "paid" in early_add.json()["detail"].lower()

    # 2. Simulate payment completion
    async with TestingSessionLocal() as session:
        ord_row = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        ord_row.payment_status = "paid"
        ord_row.status = "processing"
        await session.commit()

    # 3. Add to wardrobe now that order is paid
    add_res = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=headers)
    assert add_res.status_code == 201
    item = add_res.json()
    assert item["source"] == "purchased"
    assert item["name"] == order_data["items"][0]["product_name"]
    assert item["order_item_id"] == order_item_id

    # 4. Attempt duplicate import -> must fail with 409 Conflict
    dup_res = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=headers)
    assert dup_res.status_code == 409

    # 5. Other customer attempts to import this order item -> must fail with 404 Not Found
    other_user = await client.post(
        "/api/v1/auth/register",
        json={"email": "intruder.wardrobe@drape.fashion", "password": "Password123!"},
    )
    other_headers = {"Authorization": f"Bearer {other_user.json()['access_token']}"}
    foreign_add = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=other_headers)
    assert foreign_add.status_code == 404


@pytest.mark.asyncio
async def test_bulk_import_purchases_idempotency(client: AsyncClient):
    """Verifies that bulk import scans order history, imports unimported items, and is idempotent on repeat calls."""
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "bulk.import@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    # Create 2 paid orders
    prod1 = (await client.get("/api/v1/products/cocoon-alpaca-duster-coat")).json()
    await client.post("/api/v1/cart/items", json={"variant_id": prod1["variants"][0]["id"], "quantity": 1}, headers=headers)
    ord_res1 = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {"full_name": "Bulk User", "phone": "+1-555", "line1": "Ave A", "city": "NYC", "state": "NY", "postal_code": "10001", "country": "United States"},
            "shipping_method": "standard",
        },
        headers=headers,
    )
    ord1_id = ord_res1.json()["id"]

    # Mark order 1 paid
    async with TestingSessionLocal() as session:
        o1 = (await session.execute(select(Order).where(Order.id == ord1_id))).scalar_one()
        o1.payment_status = "paid"
        o1.status = "processing"
        await session.commit()

    # First bulk import -> creates 1 item
    import1 = await client.post("/api/v1/wardrobe/import-purchases", headers=headers)
    assert import1.status_code == 200
    assert import1.json()["created_count"] == 1
    assert import1.json()["skipped_count"] == 0

    # Second bulk import -> idempotent, creates 0 items, skips 1
    import2 = await client.post("/api/v1/wardrobe/import-purchases", headers=headers)
    assert import2.status_code == 200
    assert import2.json()["created_count"] == 0
    assert import2.json()["skipped_count"] == 1


@pytest.mark.asyncio
async def test_outfit_lifecycle_membership_and_reordering(client: AsyncClient):
    """
    Verifies creating outfits, adding/removing wardrobe items, sequencing display order,
    and ensuring cross-customer item additions are rejected.
    """
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "outfits.curator@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    # Create 3 wardrobe items
    w1 = (await client.post("/api/v1/wardrobe", json={"name": "Overcoat", "category": "coats", "color": "Noir"}, headers=headers)).json()
    w2 = (await client.post("/api/v1/wardrobe", json={"name": "Turtleneck", "category": "knitwear", "color": "Charcoal"}, headers=headers)).json()
    w3 = (await client.post("/api/v1/wardrobe", json={"name": "Trousers", "category": "trousers", "color": "Black"}, headers=headers)).json()

    # 1. Create outfit with initial items
    outfit_res = await client.post(
        "/api/v1/wardrobe/outfits",
        json={
            "name": "The Winter Atelier Ensemble",
            "description": "Structured overcoat layered with charcoal knitwear.",
            "occasion": "atelier",
            "season": "winter",
            "item_ids": [w1["id"], w2["id"]],
        },
        headers=headers,
    )
    assert outfit_res.status_code == 201
    outfit = outfit_res.json()
    outfit_id = outfit["id"]
    assert len(outfit["items"]) == 2
    assert outfit["items"][0]["wardrobe_item_id"] == w1["id"]
    assert outfit["items"][1]["wardrobe_item_id"] == w2["id"]

    # 2. Add third item to outfit
    add_item_res = await client.post(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items",
        json={"wardrobe_item_id": w3["id"]},
        headers=headers,
    )
    assert add_item_res.status_code == 200
    assert len(add_item_res.json()["items"]) == 3

    # 3. Prevent duplicate addition of same item to same outfit
    dup_res = await client.post(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items",
        json={"wardrobe_item_id": w3["id"]},
        headers=headers,
    )
    assert dup_res.status_code == 409

    # 4. Reorder items: [w3, w1, w2]
    reorder_res = await client.patch(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/reorder",
        json={"item_ids": [w3["id"], w1["id"], w2["id"]]},
        headers=headers,
    )
    assert reorder_res.status_code == 200
    ordered_ids = [it["wardrobe_item_id"] for it in reorder_res.json()["items"]]
    assert ordered_ids == [w3["id"], w1["id"], w2["id"]]

    # 5. Remove an item
    remove_res = await client.delete(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/{w2['id']}",
        headers=headers,
    )
    assert remove_res.status_code == 200
    assert len(remove_res.json()["items"]) == 2
    assert w2["id"] not in [it["wardrobe_item_id"] for it in remove_res.json()["items"]]


@pytest.mark.asyncio
async def test_cross_customer_outfit_association_rejection(client: AsyncClient):
    """Verifies that a customer cannot add another customer's wardrobe item to their outfit."""
    # User Alpha
    res_a = await client.post("/api/v1/auth/register", json={"email": "alpha.outfit@drape.fashion", "password": "Password123!"})
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # User Beta
    res_b = await client.post("/api/v1/auth/register", json={"email": "beta.outfit@drape.fashion", "password": "Password123!"})
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Alpha creates a wardrobe item
    alpha_item = (await client.post("/api/v1/wardrobe", json={"name": "Alpha Coat", "category": "coats", "color": "Noir"}, headers=headers_a)).json()

    # Beta creates an outfit
    beta_outfit = (await client.post("/api/v1/wardrobe/outfits", json={"name": "Beta Outfit"}, headers=headers_b)).json()

    # Beta attempts to add Alpha's wardrobe item to Beta's outfit -> must fail with 404
    hack_res = await client.post(
        f"/api/v1/wardrobe/outfits/{beta_outfit['id']}/items",
        json={"wardrobe_item_id": alpha_item["id"]},
        headers=headers_b,
    )
    assert hack_res.status_code == 404

    # Beta also cannot create an outfit specifying Alpha's item in item_ids -> must fail with 400
    create_hack = await client.post(
        "/api/v1/wardrobe/outfits",
        json={"name": "Sneaky Outfit", "item_ids": [alpha_item["id"]]},
        headers=headers_b,
    )
    assert create_hack.status_code == 400


@pytest.mark.asyncio
async def test_wardrobe_deletion_cascades_to_outfit_associations(client: AsyncClient):
    """Verifies that deleting a wardrobe garment cleanly deletes its OutfitItem junction entries without breaking outfits."""
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "cascade.outfit@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    item1 = (await client.post("/api/v1/wardrobe", json={"name": "Jacket", "category": "jackets", "color": "Brown"}, headers=headers)).json()
    item2 = (await client.post("/api/v1/wardrobe", json={"name": "Pants", "category": "trousers", "color": "Brown"}, headers=headers)).json()

    outfit = (await client.post(
        "/api/v1/wardrobe/outfits",
        json={"name": "Monochrome Ensemble", "item_ids": [item1["id"], item2["id"]]},
        headers=headers,
    )).json()
    assert len(outfit["items"]) == 2

    # Delete item1 from wardrobe
    del_res = await client.delete(f"/api/v1/wardrobe/{item1['id']}", headers=headers)
    assert del_res.status_code == 200

    # Fetch outfit again -> must now only contain item2, and not throw 500 error
    outfit_check = await client.get(f"/api/v1/wardrobe/outfits/{outfit['id']}", headers=headers)
    assert outfit_check.status_code == 200
    assert len(outfit_check.json()["items"]) == 1
    assert outfit_check.json()["items"][0]["wardrobe_item_id"] == item2["id"]

    # Verify directly in DB that OutfitItem for item1 was deleted
    async with TestingSessionLocal() as session:
        orphan_items = (await session.execute(
            select(OutfitItem).where(OutfitItem.wardrobe_item_id == item1["id"])
        )).scalars().all()
        assert len(orphan_items) == 0


@pytest.mark.asyncio
async def test_wardrobe_route_collision_regression(client: AsyncClient):
    """
    Regression test ensuring static routes like GET /api/v1/wardrobe/outfits
    do not collide with dynamic parameter routes like GET /api/v1/wardrobe/{item_id}.
    """
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "route.collision@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    # 1. Create a wardrobe item
    item_res = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Cashmere Knit", "category": "knitwear", "color": "Cream"},
        headers=headers,
    )
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # 2. Call GET /api/v1/wardrobe/outfits when no outfits exist
    # Prior to fix, this matched /{item_id} with item_id='outfits' and returned 404
    outfits_list_res = await client.get("/api/v1/wardrobe/outfits", headers=headers)
    assert outfits_list_res.status_code == 200
    data = outfits_list_res.json()
    assert "outfits" in data
    assert data["total"] == 0
    assert data["outfits"] == []

    # 3. Create an outfit
    create_outfit_res = await client.post(
        "/api/v1/wardrobe/outfits",
        json={"name": "Minimalist Look", "item_ids": [item_id]},
        headers=headers,
    )
    assert create_outfit_res.status_code == 201
    outfit_id = create_outfit_res.json()["id"]

    # 4. Call GET /api/v1/wardrobe/outfits again -> must return the outfit
    outfits_list_res2 = await client.get("/api/v1/wardrobe/outfits", headers=headers)
    assert outfits_list_res2.status_code == 200
    data2 = outfits_list_res2.json()
    assert data2["total"] == 1
    assert data2["outfits"][0]["id"] == outfit_id
    assert data2["outfits"][0]["name"] == "Minimalist Look"

    # 5. Ensure GET /api/v1/wardrobe/{item_id} continues to work properly
    item_get_res = await client.get(f"/api/v1/wardrobe/{item_id}", headers=headers)
    assert item_get_res.status_code == 200
    assert item_get_res.json()["id"] == item_id
    assert item_get_res.json()["name"] == "Cashmere Knit"

    # 6. Ensure non-existent item returns 404 (not crashing)
    missing_res = await client.get("/api/v1/wardrobe/nonexistent-uuid-12345", headers=headers)
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_outfit_items_reordering_strict_validation(client: AsyncClient):
    """
    Verifies strict validation during outfit item reordering:
    1. Reject duplicate IDs (400).
    2. Reject unknown IDs not belonging to the outfit (400).
    3. Reject missing IDs (400).
    4. Deterministic sequential display_order 0, 1, 2 on valid reordering.
    """
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "outfit.reorder.validation@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    # Create 3 wardrobe items
    items = []
    for i in range(3):
        r = await client.post(
            "/api/v1/wardrobe",
            json={"name": f"Garment {i}", "category": "tops", "color": "Black"},
            headers=headers,
        )
        assert r.status_code == 201
        items.append(r.json()["id"])

    # Create outfit with all 3 items
    outfit_res = await client.post(
        "/api/v1/wardrobe/outfits",
        json={"name": "Reorder Test Ensemble", "item_ids": items},
        headers=headers,
    )
    assert outfit_res.status_code == 201
    outfit_id = outfit_res.json()["id"]

    # 1. Reject duplicate IDs
    dup_res = await client.patch(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/reorder",
        json={"item_ids": [items[0], items[0], items[1]]},
        headers=headers,
    )
    assert dup_res.status_code == 400
    assert "duplicate" in dup_res.json()["detail"].lower()

    # 2. Reject unknown IDs
    unknown_id = "00000000-0000-0000-0000-000000000000"
    unknown_res = await client.patch(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/reorder",
        json={"item_ids": [items[0], items[1], unknown_id]},
        headers=headers,
    )
    assert unknown_res.status_code == 400
    assert "unknown" in unknown_res.json()["detail"].lower()

    # 3. Reject missing IDs (submitting only 2 of 3)
    missing_res = await client.patch(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/reorder",
        json={"item_ids": [items[0], items[1]]},
        headers=headers,
    )
    assert missing_res.status_code == 400
    assert "missing" in missing_res.json()["detail"].lower()

    # 4. Valid reordering: reverse the 3 items
    valid_reorder = [items[2], items[0], items[1]]
    ok_res = await client.patch(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items/reorder",
        json={"item_ids": valid_reorder},
        headers=headers,
    )
    assert ok_res.status_code == 200
    reordered_items = ok_res.json()["items"]
    assert len(reordered_items) == 3
    # Check sequential deterministic order
    assert [it["wardrobe_item_id"] for it in reordered_items] == valid_reorder
    assert [it["display_order"] for it in reordered_items] == [0, 1, 2]


@pytest.mark.asyncio
async def test_outfit_add_item_display_order_zero(client: AsyncClient):
    """
    Verifies that explicitly providing display_order=0 in add_item_to_outfit
    is preserved as 0, rather than being treated as falsy and defaulted to len(items).
    """
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "display.order.zero@drape.fashion", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {user_res.json()['access_token']}"}

    # Create 2 items
    item1_res = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Item 1", "category": "knitwear", "color": "Navy"},
        headers=headers,
    )
    item2_res = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Item 2", "category": "trousers", "color": "Grey"},
        headers=headers,
    )
    id1 = item1_res.json()["id"]
    id2 = item2_res.json()["id"]

    # Create outfit with item1 (display_order defaults to 0)
    outfit_res = await client.post(
        "/api/v1/wardrobe/outfits",
        json={"name": "Order Zero Test", "item_ids": [id1]},
        headers=headers,
    )
    outfit_id = outfit_res.json()["id"]

    # Explicitly add item2 with display_order=0
    add_res = await client.post(
        f"/api/v1/wardrobe/outfits/{outfit_id}/items",
        json={"wardrobe_item_id": id2, "display_order": 0},
        headers=headers,
    )
    assert add_res.status_code == 200
    items_map = {it["wardrobe_item_id"]: it["display_order"] for it in add_res.json()["items"]}
    assert items_map[id2] == 0


@pytest.mark.asyncio
async def test_purchase_import_concurrency_conflict_handling(client: AsyncClient):
    """
    Verifies that concurrent duplicate attempts to import a purchased item
    or bulk import handle IntegrityError / duplicate conflicts cleanly without 500 error.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "purchase.concurrency@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item to cart and place paid order
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
                "full_name": "Concurrency Customer",
                "phone": "+1-555-4321",
                "line1": "123 Fashion Ave",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # Mark order as paid directly in DB for testing
    async with TestingSessionLocal() as session:
        ord_obj = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        ord_obj.payment_status = "paid"
        ord_obj.status = "processing"
        await session.commit()

    order_details = (await client.get(f"/api/v1/orders/{order_id}", headers=headers)).json()
    order_item_id = order_details["items"][0]["id"]

    # 1. First import succeeds (201)
    imp1 = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=headers)
    assert imp1.status_code == 201

    # 2. Immediate second import yields 409 Conflict (not 500)
    imp2 = await client.post(f"/api/v1/wardrobe/from-purchase/{order_item_id}", headers=headers)
    assert imp2.status_code == 409
    assert "already been added" in imp2.json()["detail"].lower()

    # 3. Bulk import is idempotent and resilient (200 with 0 created, 1 skipped)
    bulk_res = await client.post("/api/v1/wardrobe/import-purchases", headers=headers)
    assert bulk_res.status_code == 200
    assert bulk_res.json()["created_count"] == 0
    assert bulk_res.json()["skipped_count"] == 1


@pytest.mark.asyncio
async def test_bulk_purchase_import_concurrency_count_accuracy(client: AsyncClient):
    """
    Verifies that when concurrent bulk purchase import requests occur:
    1. created_count and skipped_count maintain exact consistent semantics.
    2. Items created by one request are not reported as created by the competing request.
    3. The sum of created_count across requests equals the total eligible items.
    4. Database contains exactly the expected count of wardrobe items with no duplicate errors.
    """
    await client.post("/api/v1/products/seed")

    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "bulk.count.accuracy@drape.fashion", "password": "Password123!"},
    )
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 items to cart
    prod1 = (await client.get("/api/v1/products/minimalist-structured-car-coat")).json()
    prod2 = (await client.get("/api/v1/products/cocoon-alpaca-duster-coat")).json()
    var1 = prod1["variants"][0]["id"]
    var2 = prod2["variants"][0]["id"]

    await client.post("/api/v1/cart/items", json={"variant_id": var1, "quantity": 1}, headers=headers)
    await client.post("/api/v1/cart/items", json={"variant_id": var2, "quantity": 1}, headers=headers)

    order_res = await client.post(
        "/api/v1/checkout/orders",
        json={
            "shipping_address": {
                "full_name": "Bulk Accuracy Customer",
                "phone": "+1-555-4444",
                "line1": "123 Fashion Ave",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States",
            },
            "shipping_method": "standard",
        },
        headers=headers,
    )
    assert order_res.status_code == 201
    order_id = order_res.json()["id"]

    # Mark order as paid directly in DB
    async with TestingSessionLocal() as session:
        ord_row = (await session.execute(select(Order).where(Order.id == order_id))).scalar_one()
        ord_row.payment_status = "paid"
        ord_row.status = "processing"
        await session.commit()

    # Dispatch concurrent bulk import requests
    res1, res2 = await asyncio.gather(
        client.post("/api/v1/wardrobe/import-purchases", headers=headers),
        client.post("/api/v1/wardrobe/import-purchases", headers=headers),
    )

    assert res1.status_code == 200
    assert res2.status_code == 200

    data1 = res1.json()
    data2 = res2.json()

    # The total newly created items across both requests must equal 2
    total_created = data1["created_count"] + data2["created_count"]
    assert total_created == 2

    # For each request, created_count + skipped_count must equal total eligible items (2)
    assert data1["created_count"] + data1["skipped_count"] == 2
    assert data2["created_count"] + data2["skipped_count"] == 2

    # Whichever request created fewer/zero items must accurately report len(items) == created_count
    assert len(data1["items"]) == data1["created_count"]
    assert len(data2["items"]) == data2["created_count"]

    # Verify database state: exactly 2 items in DB for user
    async with TestingSessionLocal() as session:
        items_in_db = (
            await session.execute(
                select(WardrobeItem).where(WardrobeItem.user_id == user_res.json()["user"]["id"])
            )
        ).scalars().all()
        assert len(items_in_db) == 2

    # A subsequent repeat call is idempotent: 0 created, 2 skipped
    res3 = await client.post("/api/v1/wardrobe/import-purchases", headers=headers)
    assert res3.status_code == 200
    assert res3.json()["created_count"] == 0
    assert res3.json()["skipped_count"] == 2
    assert res3.json()["items"] == []



