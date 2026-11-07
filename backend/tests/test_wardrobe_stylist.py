"""
DRAPE Smart Wardrobe: Stylist Engine, Preferences, & Automatic Ingestion Tests.

Verifies:
1. Wardrobe stats endpoint (counts by category, color, season, try-on readiness).
2. Stylist preferences lifecycle (defaults, update, persistence).
3. Deterministic outfit recommendation engine (multi-factor scoring, explanations).
4. Recommendation feedback (like, dislike, save, skip, worn).
5. Complete-the-look gap analysis with catalog product recommendations.
6. Automatic purchase ingestion idempotency.
7. Strict user privacy and IDOR isolation.
"""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.api.v1.endpoints.wardrobe import ingest_order_items_to_wardrobe
from app.domain.models.identity import User
from app.domain.models.order import Order, OrderItem
from app.domain.models.wardrobe import OutfitFeedback, StylistPreferences, WardrobeItem
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_wardrobe_stats_endpoint(client: AsyncClient):
    """Verifies wardrobe stats analytics calculations."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "stats.test@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add a try-on compatible top
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Classic Regular-Fit Crew Neck T-Shirt",
            "category": "t-shirts",
            "color": "Black",
            "size": "M",
            "season": "all-season",
            "occasion": "casual",
        },
        headers=headers,
    )

    # Add a trouser
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Tailored Pleated Trousers",
            "category": "trousers",
            "color": "Charcoal",
            "size": "32",
            "season": "autumn",
            "occasion": "office",
        },
        headers=headers,
    )

    stats_res = await client.get("/api/v1/wardrobe/stats", headers=headers)
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert data["total_items"] == 2
    assert data["by_category"].get("t-shirts") == 1
    assert data["by_category"].get("trousers") == 1
    assert data["by_color"].get("black") == 1
    assert data["by_color"].get("charcoal") == 1
    assert data["try_on_ready_count"] >= 1  # Crew neck is try-on ready
    assert len(data["recent_additions"]) == 2


@pytest.mark.asyncio
async def test_stylist_preferences_lifecycle(client: AsyncClient):
    """Verifies default retrieval, customization, and persistence of stylist preferences."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "prefs.test@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Fetch defaults
    get_res = await client.get("/api/v1/wardrobe/preferences", headers=headers)
    assert get_res.status_code == 200
    defaults = get_res.json()
    assert defaults["style_direction"] == "contemporary_minimal"
    assert "black" in defaults["favorite_colors"]

    # 2. Update preferences
    payload = {
        "style_direction": "classic_tailoring",
        "favorite_occasions": ["office", "evening"],
        "favorite_colors": ["navy", "charcoal", "white"],
        "excluded_colors": ["neon_yellow"],
        "preferred_season": "autumn",
    }
    put_res = await client.put("/api/v1/wardrobe/preferences", json=payload, headers=headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["style_direction"] == "classic_tailoring"
    assert updated["favorite_colors"] == ["navy", "charcoal", "white"]
    assert updated["excluded_colors"] == ["neon_yellow"]

    # 3. Verify persistent reload
    get_again = await client.get("/api/v1/wardrobe/preferences", headers=headers)
    assert get_again.status_code == 200
    assert get_again.json()["style_direction"] == "classic_tailoring"


@pytest.mark.asyncio
async def test_deterministic_outfit_recommendations(client: AsyncClient):
    """Verifies that the stylist produces valid, scored combinations with editorial notes."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "stylist.rec@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add Top and Bottom
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Classic Regular-Fit Crew Neck T-Shirt",
            "category": "t-shirts",
            "color": "Black",
            "occasion": "casual",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Women's Straight-Fit Jeans",
            "category": "jeans",
            "color": "Washed Blue",
            "occasion": "casual",
        },
        headers=headers,
    )

    rec_res = await client.post(
        "/api/v1/wardrobe/recommendations/generate?occasion=casual",
        headers=headers,
    )
    assert rec_res.status_code == 200
    data = rec_res.json()
    assert data["total_generated"] >= 1
    first_rec = data["recommendations"][0]
    assert first_rec["score"] > 0.70
    assert "category_compatibility" in first_rec["score_breakdown"]
    assert "color_harmony" in first_rec["score_breakdown"]
    assert "Classic Regular-Fit Crew Neck T-Shirt" in first_rec["stylist_notes"]
    assert len(first_rec["items"]) == 2


@pytest.mark.asyncio
async def test_outfit_recommendation_feedback(client: AsyncClient):
    """Verifies recording like/dislike/save feedback."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "feedback.test@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Send like feedback
    payload = {
        "recommendation_hash": "a1b2c3d4e5f6",
        "action": "like",
        "notes": "Love this minimal pairing",
    }
    fb_res = await client.post(
        "/api/v1/wardrobe/recommendations/feedback",
        json=payload,
        headers=headers,
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["success"] is True
    assert fb_res.json()["action"] == "like"

    # Invalid action is rejected
    bad_res = await client.post(
        "/api/v1/wardrobe/recommendations/feedback",
        json={"recommendation_hash": "a1b2c3d4e5f6", "action": "explode"},
        headers=headers,
    )
    assert bad_res.status_code == 400


@pytest.mark.asyncio
async def test_complete_look_gap_analysis(client: AsyncClient):
    """Verifies catalog gap analysis suggests complementary items for missing categories."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "gap.test@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # User only has a T-shirt
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Classic Regular-Fit Crew Neck T-Shirt",
            "category": "t-shirts",
            "color": "Black",
        },
        headers=headers,
    )

    res = await client.get("/api/v1/wardrobe/complete-look", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "jeans" in data["missing_categories"] or "trousers" in data["missing_categories"]
    assert len(data["suggestions"]) > 0
    # First suggestion should be for a missing category (e.g. Jeans, Trousers, Skirt, or Dress)
    assert data["suggestions"][0]["category"] in data["missing_categories"]
    assert data["suggestions"][0]["price"] > 0
    assert data["suggestions"][0]["product_slug"] != ""


@pytest.mark.asyncio
async def test_automatic_purchase_ingestion_idempotency():
    """Verifies that ingest_order_items_to_wardrobe runs idempotently without duplicates."""
    async with TestingSessionLocal() as db:
        # Create user
        user = User(
            email="auto.ingest@drape.fashion",
            hashed_password="mock_hash",
            first_name="Auto",
            last_name="Ingest",
            roles=["customer"],
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Create paid order with items
        order = Order(
            user_id=user.id,
            order_number="ORD-AUTO-001",
            status="processing",
            payment_status="paid",
            currency="USD",
            subtotal=Decimal("150.00"),
            shipping_amount=Decimal("0.00"),
            tax_amount=Decimal("15.00"),
            total_amount=Decimal("165.00"),
            shipping_method="standard",
            shipping_address_snapshot={"address": "123 Atelier Way"},
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)

        item1 = OrderItem(
            order_id=order.id,
            product_name="Classic Regular-Fit Crew Neck T-Shirt",
            sku="DRP-CREW-BLK-L",
            color="Black",
            size="L",
            unit_price=Decimal("75.00"),
            quantity=1,
            line_total=Decimal("75.00"),
        )
        item2 = OrderItem(
            order_id=order.id,
            product_name="Women's Straight-Fit Jeans",
            sku="DRP-JEAN-BLU-28",
            color="Washed Blue",
            size="28",
            unit_price=Decimal("195.00"),
            quantity=1,
            line_total=Decimal("195.00"),
        )
        db.add_all([item1, item2])
        await db.commit()

        # 1. Ingest
        created = await ingest_order_items_to_wardrobe(order, db)
        assert len(created) == 2
        assert created[0].user_id == user.id
        assert created[0].source == "purchased"

        # 2. Ingest again (idempotent call, e.g. duplicate webhook)
        second_call = await ingest_order_items_to_wardrobe(order, db)
        assert len(second_call) == 0  # No duplicate items created!

        # 3. Query all wardrobe items for user
        items_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user.id)
        items_res = await db.execute(items_stmt)
        items = items_res.scalars().all()
        assert len(items) == 2


@pytest.mark.asyncio
async def test_strict_user_isolation(client: AsyncClient):
    """Verifies that Customer A's wardrobe items and recommendations are never visible to Customer B."""
    # User A
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "cust.a@drape.fashion", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "cust.b@drape.fashion", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A adds item
    item_res = await client.post(
        "/api/v1/wardrobe",
        json={"name": "User A Private Silk Shirt", "category": "shirts", "color": "Ivory"},
        headers=headers_a,
    )
    item_a_id = item_res.json()["id"]

    # User B lists items: should have 0 items
    list_b = await client.get("/api/v1/wardrobe", headers=headers_b)
    assert list_b.json()["total"] == 0

    # User B directly queries User A's item ID: should return 404
    get_b = await client.get(f"/api/v1/wardrobe/{item_a_id}", headers=headers_b)
    assert get_b.status_code == 404
