"""
Comprehensive Test Suite for DRAPE Customer Authentication & Accounts.

Tests registration, duplicate account prevention, credential login, password
verification, JWT verification, session rotation, session revocation on logout,
RFC 9457 Problem Details formats, unauthenticated profile access rejection,
cross-user data isolation, and granular privacy consent management.
Conforms to PRD FR-006, SEC-001, SEC-002, and SYSTEM_ARCHITECTURE.md §8.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_successful_customer_registration(client: AsyncClient):
    """Verifies that a customer can register and receives valid tokens and user profile."""
    payload = {
        "email": "couture.shopper@drape.fashion",
        "password": "StrongPassword2026!",
        "first_name": "Elena",
        "last_name": "Rostova",
        "camera_processing_opt_in": True,
        "marketing_emails_opt_in": False,
    }

    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"
    assert data["expires_in_seconds"] == 900
    assert data["user"]["email"] == "couture.shopper@drape.fashion"
    assert data["user"]["first_name"] == "Elena"
    assert data["user"]["last_name"] == "Rostova"
    assert data["user"]["is_active"] is True
    assert "customer" in data["user"]["roles"]

    # Verify cookies are set
    cookies = response.cookies
    assert "drape_access_token" in cookies
    assert "drape_refresh_token" in cookies


@pytest.mark.asyncio
async def test_duplicate_email_registration_rejection(client: AsyncClient):
    """Rejects duplicate registration with RFC 9457 409 Conflict problem details."""
    payload = {
        "email": "unique.shopper@drape.fashion",
        "password": "SecurePassword123!",
    }

    # First registration must succeed
    first = await client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    # Second registration with identical email must be rejected with 409
    second = await client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    data = second.json()
    assert data["status"] == 409
    assert "already exists" in data["detail"].lower()
    assert response_is_problem_details(data)


@pytest.mark.asyncio
async def test_registration_validation_errors(client: AsyncClient):
    """Validates email format and minimum password length requirements."""
    # Bad email
    res1 = await client.post(
        "/api/v1/auth/register",
        json={"email": "invalid-email-no-domain", "password": "Short1!"},
    )
    assert res1.status_code == 422
    assert response_is_problem_details(res1.json())

    # Short password (< 8 chars)
    res2 = await client.post(
        "/api/v1/auth/register",
        json={"email": "valid@drape.fashion", "password": "short"},
    )
    assert res2.status_code == 422


@pytest.mark.asyncio
async def test_successful_login(client: AsyncClient):
    """Authenticates valid credentials, issuing persistent session and tokens."""
    email = "login.test@drape.fashion"
    password = "AtelierPassword2026!"

    # Setup user
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "first_name": "Kai"},
    )
    assert reg.status_code == 201

    # Login
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == email


@pytest.mark.asyncio
async def test_invalid_password_rejection(client: AsyncClient):
    """Rejects incorrect password with 401 Unauthorized Problem Details."""
    email = "wrong.password@drape.fashion"
    password = "RealPassword2026!"

    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password},
    )

    bad_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "IncorrectPassword!"},
    )
    assert bad_login.status_code == 401
    data = bad_login.json()
    assert data["status"] == 401
    assert "invalid email or password" in data["detail"].lower()
    assert response_is_problem_details(data)


@pytest.mark.asyncio
async def test_token_and_session_validation(client: AsyncClient):
    """Verifies that access tokens successfully authorize protected endpoints."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "session.tester@drape.fashion",
            "password": "Password12345!",
            "first_name": "Sonia",
        },
    )
    access_token = reg.json()["access_token"]

    # Access /api/v1/users/me with Bearer token header
    me_res = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "session.tester@drape.fashion"
    assert me_data["first_name"] == "Sonia"


@pytest.mark.asyncio
async def test_logout_and_session_revocation(client: AsyncClient):
    """Validates that logging out explicitly revokes the session in PostgreSQL."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "logout.tester@drape.fashion", "password": "Password123!"},
    )
    access_token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Verify active access
    pre_logout = await client.get("/api/v1/users/me", headers=headers)
    assert pre_logout.status_code == 200

    # Execute logout
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert "logged out" in logout_res.json()["message"].lower()

    # The access token belongs to a revoked session -> must be rejected with 401
    post_logout = await client.get("/api/v1/users/me", headers=headers)
    assert post_logout.status_code == 401
    assert "revoked" in post_logout.json()["detail"].lower()


@pytest.mark.asyncio
async def test_refresh_token_lifecycle_and_rotation(client: AsyncClient):
    """Tests refresh token rotation and usage to obtain new access tokens."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "refresh.tester@drape.fashion", "password": "Password123!"},
    )
    refresh_token = reg.json()["refresh_token"]

    # Exchange refresh token
    ref_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    new_access_token = ref_data["access_token"]
    new_refresh_token = ref_data["refresh_token"]

    assert new_access_token != reg.json()["access_token"]
    assert new_refresh_token != refresh_token

    # Verify new access token works
    test_res = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {new_access_token}"},
    )
    assert test_res.status_code == 200


@pytest.mark.asyncio
async def test_unauthenticated_profile_access_rejection(client: AsyncClient):
    """Ensures protected endpoints reject unauthenticated requests with 401."""
    res = await client.get("/api/v1/users/me")
    assert res.status_code == 401
    assert response_is_problem_details(res.json())

    patch_res = await client.patch("/api/v1/users/me", json={"first_name": "Hacker"})
    assert patch_res.status_code == 401


@pytest.mark.asyncio
async def test_cross_user_isolation_and_profile_editing(client: AsyncClient):
    """Guarantees that customers can only read and modify their own account profile."""
    # Register User A
    user_a = await client.post(
        "/api/v1/auth/register",
        json={"email": "usera@drape.fashion", "password": "PasswordUserA!", "first_name": "Alice"},
    )
    token_a = user_a.json()["access_token"]

    # Register User B
    user_b = await client.post(
        "/api/v1/auth/register",
        json={"email": "userb@drape.fashion", "password": "PasswordUserB!", "first_name": "Bob"},
    )
    token_b = user_b.json()["access_token"]

    # User A modifies their profile
    patch_a = await client.patch(
        "/api/v1/users/me",
        json={"first_name": "Alicia", "last_name": "Vanderbilt"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert patch_a.status_code == 200
    assert patch_a.json()["first_name"] == "Alicia"
    assert patch_a.json()["last_name"] == "Vanderbilt"

    # User B's profile must remain unchanged and unaffected
    get_b = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_b.status_code == 200
    assert get_b.json()["first_name"] == "Bob"
    assert get_b.json()["email"] == "userb@drape.fashion"


@pytest.mark.asyncio
async def test_independent_consent_preferences_lifecycle(client: AsyncClient):
    """Verifies retrieval and granular, independent updates to customer consent options."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "consent.user@drape.fashion",
            "password": "Password123!",
            "camera_processing_opt_in": True,
            "marketing_emails_opt_in": False,
        },
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial consents
    consent_res = await client.get("/api/v1/users/me/consents", headers=headers)
    assert consent_res.status_code == 200
    consents = consent_res.json()
    assert consents["camera_processing_opt_in"] is True
    assert consents["ai_tryon_storage_opt_in"] is False
    assert consents["marketing_emails_opt_in"] is False
    assert consents["analytics_opt_in"] is False

    # Granular update: Enable marketing emails without changing camera permission
    patch_res = await client.patch(
        "/api/v1/users/me/consents",
        json={"marketing_emails_opt_in": True},
        headers=headers,
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["marketing_emails_opt_in"] is True
    assert updated["camera_processing_opt_in"] is True  # Preserved!

    # Granular update: Revoke camera permission independently
    patch_res2 = await client.patch(
        "/api/v1/users/me/consents",
        json={"camera_processing_opt_in": False},
        headers=headers,
    )
    assert patch_res2.status_code == 200
    updated2 = patch_res2.json()
    assert updated2["camera_processing_opt_in"] is False
    assert updated2["marketing_emails_opt_in"] is True  # Preserved!


def response_is_problem_details(data: dict) -> bool:
    """Helper confirming RFC 9457 Problem Details shape."""
    return (
        "type" in data
        and "title" in data
        and "status" in data
        and "detail" in data
        and "instance" in data
    )

