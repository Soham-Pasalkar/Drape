"""
DRAPE Customer Address Management Test Suite.

Verifies:
1. Address creation, default address assignment.
2. Address listing with default sorted first.
3. Address updating and explicit default address setting.
4. Address deletion and fallback default promotion.
5. Strict cross-customer isolation (Customer B cannot view, update, or delete Customer A's address).
6. Unauthenticated request rejection.
7. Validation on required fields and invalid payloads.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_address_crud_and_single_default(client: AsyncClient):
    """Verifies complete address lifecycle and single-default constraint."""
    # Register customer
    user_res = await client.post(
        "/api/v1/auth/register",
        json={"email": "address.tester@drape.fashion", "password": "Password123!"},
    )
    assert user_res.status_code == 201
    token = user_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initially empty
    list_res = await client.get("/api/v1/addresses", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json() == []

    # 2. Create first address -> automatically becomes default
    addr1_payload = {
        "full_name": "Eleanor Vance",
        "phone": "+1-555-0199",
        "line1": "742 Evergreen Terrace",
        "line2": "Apt 4B",
        "city": "Springfield",
        "state": "OR",
        "postal_code": "97477",
        "country": "United States",
        "address_type": "home",
        "is_default": False,  # Should become default automatically as first address
    }
    create1_res = await client.post("/api/v1/addresses", json=addr1_payload, headers=headers)
    assert create1_res.status_code == 201
    addr1 = create1_res.json()
    assert addr1["full_name"] == "Eleanor Vance"
    assert addr1["is_default"] is True
    addr1_id = addr1["id"]

    # 3. Create second address with is_default=True -> demotes addr1
    addr2_payload = {
        "full_name": "Eleanor Vance Atelier",
        "phone": "+1-555-0288",
        "line1": "100 Fashion Blvd",
        "line2": "Suite 900",
        "city": "New York",
        "state": "NY",
        "postal_code": "10001",
        "country": "United States",
        "address_type": "work",
        "is_default": True,
    }
    create2_res = await client.post("/api/v1/addresses", json=addr2_payload, headers=headers)
    assert create2_res.status_code == 201
    addr2 = create2_res.json()
    assert addr2["is_default"] is True
    addr2_id = addr2["id"]

    # Verify addr1 was demoted
    list_res = await client.get("/api/v1/addresses", headers=headers)
    addresses = list_res.json()
    assert len(addresses) == 2
    # Default should be sorted first
    assert addresses[0]["id"] == addr2_id
    assert addresses[0]["is_default"] is True
    assert addresses[1]["id"] == addr1_id
    assert addresses[1]["is_default"] is False

    # 4. Update address
    update_res = await client.patch(
        f"/api/v1/addresses/{addr1_id}",
        json={"line2": "Penthouse", "city": "Eugene"},
        headers=headers,
    )
    assert update_res.status_code == 200
    updated_addr = update_res.json()
    assert updated_addr["line2"] == "Penthouse"
    assert updated_addr["city"] == "Eugene"

    # 5. Switch default via /addresses/{id}/default
    set_default_res = await client.post(
        f"/api/v1/addresses/{addr1_id}/default",
        headers=headers,
    )
    assert set_default_res.status_code == 200
    assert set_default_res.json()["is_default"] is True

    # Check addr2 is now not default
    list_res = await client.get("/api/v1/addresses", headers=headers)
    assert list_res.json()[0]["id"] == addr1_id
    assert list_res.json()[0]["is_default"] is True
    assert list_res.json()[1]["id"] == addr2_id
    assert list_res.json()[1]["is_default"] is False

    # 6. Delete default address -> promotes addr2 to default
    del_res = await client.delete(f"/api/v1/addresses/{addr1_id}", headers=headers)
    assert del_res.status_code == 204

    list_res = await client.get("/api/v1/addresses", headers=headers)
    remaining = list_res.json()
    assert len(remaining) == 1
    assert remaining[0]["id"] == addr2_id
    assert remaining[0]["is_default"] is True


@pytest.mark.asyncio
async def test_address_customer_isolation(client: AsyncClient):
    """Guarantees Customer B cannot view, modify, or delete Customer A's address."""
    # Register Customer A
    res_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "addr.customer.a@drape.fashion", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]

    # Register Customer B
    res_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "addr.customer.b@drape.fashion", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]

    # Customer A adds an address
    addr_payload = {
        "full_name": "Customer A",
        "phone": "+1-555-1111",
        "line1": "10 Downing St",
        "city": "London",
        "state": "Greater London",
        "postal_code": "SW1A 2AA",
        "country": "United Kingdom",
    }
    create_res = await client.post(
        "/api/v1/addresses",
        json=addr_payload,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert create_res.status_code == 201
    addr_id = create_res.json()["id"]

    # Customer B cannot update Customer A's address
    patch_b = await client.patch(
        f"/api/v1/addresses/{addr_id}",
        json={"city": "Manchester"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert patch_b.status_code == 404

    # Customer B cannot delete Customer A's address
    del_b = await client.delete(
        f"/api/v1/addresses/{addr_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert del_b.status_code == 404

    # Customer B cannot promote Customer A's address to default
    default_b = await client.post(
        f"/api/v1/addresses/{addr_id}/default",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert default_b.status_code == 404

    # Customer B's list remains empty
    list_b = await client.get(
        "/api/v1/addresses",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert list_b.status_code == 200
    assert list_b.json() == []


@pytest.mark.asyncio
async def test_address_validation_and_auth(client: AsyncClient):
    """Verifies that unauthenticated requests and invalid payloads are rejected."""
    # Unauthenticated rejected
    get_res = await client.get("/api/v1/addresses")
    assert get_res.status_code == 401

    post_res = await client.post("/api/v1/addresses", json={})
    assert post_res.status_code == 401

    # Login customer
    res = await client.post(
        "/api/v1/auth/register",
        json={"email": "addr.val@drape.fashion", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Missing required fields
    bad_payload = {"full_name": "A"}  # Name too short, missing line1, city, etc.
    bad_res = await client.post("/api/v1/addresses", json=bad_payload, headers=headers)
    assert bad_res.status_code == 422

