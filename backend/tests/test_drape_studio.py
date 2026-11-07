"""
DRAPE Studio: Daily Stylist, Wear Diary, Wardrobe Rotation, & Outfit Planner Tests.

Verifies:
1. Daily Stylist endpoint: greeting, date context, top recommendation, alternatives, stylist tip.
2. Wear Log lifecycle: creation with immutable snapshots, date filtering, detail fetch, deletion.
3. Wear Repeat Suppression & Rotation Strategy: logging a garment lowers its rotation health score in recommendations.
4. Wardrobe Rotation Analytics: most worn, least worn, usage categorization (unworn, balanced, frequent).
5. Outfit Planner lifecycle: scheduling, status updating, and mark-worn conversion to a permanent WearLog.
6. Personal Style Profile: color distribution, category distribution, behavioral insights.
7. Multi-tenant privacy and IDOR isolation for wear logs and outfit plans.
"""

from datetime import date, timedelta
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_daily_stylist_endpoint(client: AsyncClient):
    """Verifies daily stylist greeting, recommendation generation, and seasonal context."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "daily.stylist@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Seed top and bottom
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Classic Regular-Fit Crew Neck T-Shirt",
            "category": "t-shirts",
            "color": "Black",
            "size": "L",
        },
        headers=headers,
    )
    await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Relaxed Straight-Leg Denim Jeans",
            "category": "jeans",
            "color": "Washed Blue",
            "size": "32",
        },
        headers=headers,
    )

    res = await client.get("/api/v1/wardrobe/stylist/daily", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "Good morning" in data["greeting"]
    assert "date_display" in data
    assert "weather_summary" in data
    assert "stylist_tip" in data
    assert data["todays_pick"] is not None
    assert len(data["todays_pick"]["items"]) == 2
    assert "reasons" in data["todays_pick"]


@pytest.mark.asyncio
async def test_wear_log_lifecycle(client: AsyncClient):
    """Verifies creating, listing, retrieving, and deleting wear logs with immutable snapshot preservation."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "wear.log@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add a garment
    g_res = await client.post(
        "/api/v1/wardrobe",
        json={
            "name": "Boxy Heavyweight T-Shirt",
            "category": "t-shirts",
            "color": "Charcoal",
            "size": "M",
        },
        headers=headers,
    )
    garment_id = g_res.json()["id"]

    # 1. Log wear today
    today_str = date.today().isoformat()
    log_res = await client.post(
        "/api/v1/wardrobe/wear-logs",
        json={
            "wear_date": today_str,
            "occasion": "casual",
            "notes": "Atelier design studio session",
            "wardrobe_item_ids": [garment_id],
        },
        headers=headers,
    )
    assert log_res.status_code == 201
    log_data = log_res.json()
    wear_log_id = log_data["id"]
    assert log_data["wear_date"] == today_str
    assert len(log_data["items"]) == 1
    assert log_data["items"][0]["garment_name_snapshot"] == "Boxy Heavyweight T-Shirt"
    assert log_data["items"][0]["color_snapshot"] == "Charcoal"

    # 2. List wear logs
    list_res = await client.get("/api/v1/wardrobe/wear-logs?days=7", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1

    # 3. Get single wear log
    get_res = await client.get(f"/api/v1/wardrobe/wear-logs/{wear_log_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == wear_log_id

    # 4. Delete wear log
    del_res = await client.delete(f"/api/v1/wardrobe/wear-logs/{wear_log_id}", headers=headers)
    assert del_res.status_code == 200

    # 5. Confirm deletion
    list_res2 = await client.get("/api/v1/wardrobe/wear-logs", headers=headers)
    assert list_res2.json()["total"] == 0


@pytest.mark.asyncio
async def test_wear_repeat_suppression_and_rotation_strategy(client: AsyncClient):
    """Verifies that wearing a garment suppresses its rotation score in recommendation generation."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "rotation.suppression@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 tops and 1 bottom
    top1 = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Everyday Crew White", "category": "t-shirts", "color": "White"},
        headers=headers,
    )
    top2 = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Everyday Crew Black", "category": "t-shirts", "color": "Black"},
        headers=headers,
    )
    bottom = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Classic Navy Chinos", "category": "trousers", "color": "Navy"},
        headers=headers,
    )
    top1_id = top1.json()["id"]
    top2_id = top2.json()["id"]
    bottom_id = bottom.json()["id"]

    # Generate initial recommendations before any wear
    initial_recs = await client.post(
        "/api/v1/wardrobe/recommendations/generate",
        headers=headers,
    )
    assert initial_recs.status_code == 200

    # Log wear of top1 today
    await client.post(
        "/api/v1/wardrobe/wear-logs",
        json={
            "wear_date": date.today().isoformat(),
            "wardrobe_item_ids": [top1_id, bottom_id],
        },
        headers=headers,
    )

    # Set rotation strategy to avoid_recent
    await client.put(
        "/api/v1/wardrobe/preferences",
        json={
            "style_direction": "contemporary_minimal",
            "favorite_occasions": ["casual"],
            "favorite_colors": ["black", "white", "navy"],
            "excluded_colors": [],
            "preferred_season": "all-season",
            "rotation_strategy": "avoid_recent",
            "inferred_favorites": {},
        },
        headers=headers,
    )

    # Generate recommendations after wear
    after_recs = await client.post(
        "/api/v1/wardrobe/recommendations/generate",
        headers=headers,
    )
    assert after_recs.status_code == 200
    recs = after_recs.json()["recommendations"]
    assert len(recs) >= 1

    # The top recommendation should prefer top2 (unworn) over top1 (worn today)
    top_pick_item_ids = [it["wardrobe_item"]["id"] for it in recs[0]["items"]]
    assert top2_id in top_pick_item_ids


@pytest.mark.asyncio
async def test_wardrobe_rotation_analytics(client: AsyncClient):
    """Verifies rotation analytics calculations for most worn, least worn, and usage status."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "analytics.rotation@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add 2 items
    g1 = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Garment Alpha", "category": "t-shirts", "color": "White"},
        headers=headers,
    )
    g2 = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Garment Beta", "category": "jeans", "color": "Black"},
        headers=headers,
    )
    g1_id = g1.json()["id"]
    g2_id = g2.json()["id"]

    # Log Alpha twice
    await client.post(
        "/api/v1/wardrobe/wear-logs",
        json={"wardrobe_item_ids": [g1_id], "wear_date": date.today().isoformat()},
        headers=headers,
    )
    await client.post(
        "/api/v1/wardrobe/wear-logs",
        json={"wardrobe_item_ids": [g1_id], "wear_date": (date.today() - timedelta(days=2)).isoformat()},
        headers=headers,
    )

    rot_res = await client.get("/api/v1/wardrobe/rotation", headers=headers)
    assert rot_res.status_code == 200
    data = rot_res.json()
    assert data["total_logged_wears"] == 2
    assert len(data["most_worn"]) >= 1
    assert data["most_worn"][0]["wardrobe_item_id"] == g1_id
    assert data["most_worn"][0]["total_wears"] == 2

    # Beta was never worn -> unworn
    unworn_beta = [x for x in data["all_garments"] if x["wardrobe_item_id"] == g2_id]
    assert len(unworn_beta) == 1
    assert unworn_beta[0]["rotation_status"] == "unworn"


@pytest.mark.asyncio
async def test_outfit_planner_and_mark_worn(client: AsyncClient):
    """Verifies scheduling an outfit, querying upcoming plans, and converting to a permanent WearLog."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "planner.test@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add item
    g = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Silk Midi Dress", "category": "dresses", "color": "Black"},
        headers=headers,
    )
    g_id = g.json()["id"]

    # 1. Schedule outfit for tomorrow
    tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
    plan_res = await client.post(
        "/api/v1/wardrobe/planner",
        json={
            "plan_date": tomorrow_str,
            "occasion": "formal",
            "notes": "Evening gallery vernissage",
            "wardrobe_item_ids": [g_id],
        },
        headers=headers,
    )
    assert plan_res.status_code == 201
    plan = plan_res.json()
    plan_id = plan["id"]
    assert plan["plan_date"] == tomorrow_str
    assert plan["status"] == "planned"

    # 2. List planned outfits
    list_res = await client.get("/api/v1/wardrobe/planner", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 1

    # 3. Mark plan as worn
    worn_res = await client.post(f"/api/v1/wardrobe/planner/{plan_id}/mark-worn", headers=headers)
    assert worn_res.status_code == 200
    wear_log = worn_res.json()
    assert wear_log["wear_date"] == tomorrow_str
    assert len(wear_log["items"]) == 1
    assert wear_log["items"][0]["garment_name_snapshot"] == "Silk Midi Dress"

    # 4. Verify plan status updated to worn
    updated_plans = await client.get(f"/api/v1/wardrobe/planner?status=worn", headers=headers)
    assert updated_plans.status_code == 200
    assert updated_plans.json()["total"] == 1


@pytest.mark.asyncio
async def test_personal_style_profile(client: AsyncClient):
    """Verifies synthesis of declared preferences and wardrobe distribution into style profile insights."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "profile.style@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await client.post(
        "/api/v1/wardrobe",
        json={"name": "Black Tee", "category": "t-shirts", "color": "Black"},
        headers=headers,
    )
    await client.post(
        "/api/v1/wardrobe",
        json={"name": "Navy Trouser", "category": "trousers", "color": "Navy"},
        headers=headers,
    )

    prof_res = await client.get("/api/v1/wardrobe/style-profile", headers=headers)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["total_wardrobe_items"] == 2
    assert "Black" in prof["color_distribution"]
    assert len(prof["insights"]) >= 2


@pytest.mark.asyncio
async def test_wear_log_and_planner_idor_isolation(client: AsyncClient):
    """Verifies that customers cannot read, update, or delete other users' wear logs or outfit plans."""
    # User A
    reg_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "usera.idor@drape.fashion", "password": "Password123!"},
    )
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # User B
    reg_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "userb.idor@drape.fashion", "password": "Password123!"},
    )
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a wear log
    item_a = await client.post(
        "/api/v1/wardrobe",
        json={"name": "Garment A", "category": "t-shirts", "color": "White"},
        headers=headers_a,
    )
    log_a = await client.post(
        "/api/v1/wardrobe/wear-logs",
        json={"wardrobe_item_ids": [item_a.json()["id"]], "wear_date": date.today().isoformat()},
        headers=headers_a,
    )
    log_a_id = log_a.json()["id"]

    # User B tries to read User A's wear log
    get_res = await client.get(f"/api/v1/wardrobe/wear-logs/{log_a_id}", headers=headers_b)
    assert get_res.status_code == 404

    # User B tries to delete User A's wear log
    del_res = await client.delete(f"/api/v1/wardrobe/wear-logs/{log_a_id}", headers=headers_b)
    assert del_res.status_code == 404

    # User A creates a plan
    plan_a = await client.post(
        "/api/v1/wardrobe/planner",
        json={"plan_date": (date.today() + timedelta(days=2)).isoformat(), "notes": "Private plan"},
        headers=headers_a,
    )
    plan_a_id = plan_a.json()["id"]

    # User B tries to mark-worn User A's plan
    mw_res = await client.post(f"/api/v1/wardrobe/planner/{plan_a_id}/mark-worn", headers=headers_b)
    assert mw_res.status_code == 404

    # User B tries to delete User A's plan
    del_p_res = await client.delete(f"/api/v1/wardrobe/planner/{plan_a_id}", headers=headers_b)
    assert del_p_res.status_code == 404

