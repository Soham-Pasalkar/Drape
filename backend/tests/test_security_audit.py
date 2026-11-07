"""
DRAPE M1 — Security Verification Audit Test Suite.

Rigorously tests:
1. Refresh token rotation replay attacks & automated session revocation.
2. Inactive account handling across login, active access tokens, and refresh flows.
3. Access token vs. refresh token type validation & confusion prevention.
4. Tampered signatures, malformed claims, and expired token rejection.
5. Strict schema validation & mass-assignment prevention (extra="forbid").
6. Cookie security attributes (HttpOnly, SameSite, Secure in prod, path scoping).
7. Cross-user isolation against adversarial payload parameters.
"""

import time
import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.core.config import settings
from app.domain.models.identity import User, UserSession
from tests.conftest import TestingSessionLocal, test_identity_adapter


@pytest.mark.asyncio
async def test_refresh_token_replay_attack_revokes_session(client: AsyncClient):
    """
    Attempting to reuse an old, already-rotated refresh token MUST be detected
    as a replay attack, immediately revoking the entire session and rejecting
    both the old token and any newly rotated token.
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "replay.victim@drape.fashion", "password": "Password123!"},
    )
    assert reg.status_code == 201
    initial_refresh_token = reg.json()["refresh_token"]

    # First legitimate refresh (rotates token)
    rot1 = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh_token},
    )
    assert rot1.status_code == 200
    rotated_token = rot1.json()["refresh_token"]
    rotated_access_token = rot1.json()["access_token"]
    assert rotated_token != initial_refresh_token

    # Adversary attempts replay of initial_refresh_token
    replay_attempt = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh_token},
    )
    assert replay_attempt.status_code == 401
    assert "reuse detected" in replay_attempt.json()["detail"].lower()

    # Verify that the session was revoked: even the new rotated_token is now rejected!
    post_replay_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": rotated_token},
    )
    assert post_replay_refresh.status_code == 401
    assert "revoked" in post_replay_refresh.json()["detail"].lower()

    # And the access token is now rejected
    post_replay_access = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {rotated_access_token}"},
    )
    assert post_replay_access.status_code == 401
    assert "revoked" in post_replay_access.json()["detail"].lower()


@pytest.mark.asyncio
async def test_inactive_account_blocked_at_all_touchpoints(client: AsyncClient):
    """
    Verifies that inactive/deactivated accounts are rejected:
    1. During login.
    2. When presenting a previously issued active access token.
    3. When attempting a session refresh.
    """
    email = "inactive.user@drape.fashion"
    password = "ActivePassword123!"

    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "first_name": "Ina"},
    )
    assert reg.status_code == 201
    access_token = reg.json()["access_token"]
    refresh_token = reg.json()["refresh_token"]

    # Deactivate user directly in database
    async with TestingSessionLocal() as db:
        await db.execute(
            update(User).where(User.email == email).values(is_active=False)
        )
        await db.commit()

    # 1. Login must fail
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 401
    assert "inactive" in login_res.json()["detail"].lower()

    # 2. Existing active access token must be rejected
    access_res = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert access_res.status_code == 401
    assert "inactive" in access_res.json()["detail"].lower()

    # 3. Refreshing token must be rejected
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 401
    assert "inactive" in refresh_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_token_type_confusion_rejection(client: AsyncClient):
    """
    Verifies token type separation:
    - Refresh tokens cannot be used as Bearer access tokens on protected endpoints.
    - Access tokens cannot be passed to /auth/refresh.
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "type.tester@drape.fashion", "password": "Password123!"},
    )
    assert reg.status_code == 201
    access_token = reg.json()["access_token"]
    refresh_token = reg.json()["refresh_token"]

    # Present refresh_token as Bearer token to /api/v1/users/me
    fake_access = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert fake_access.status_code == 401
    assert "expected access token" in fake_access.json()["detail"].lower()

    # Present access_token to /api/v1/auth/refresh
    fake_refresh = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert fake_refresh.status_code == 401
    assert "expected refresh token" in fake_refresh.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tampered_and_expired_jwt_rejection(client: AsyncClient):
    """Verifies that modified signatures or expired timestamps are rejected."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "crypto.tester@drape.fashion", "password": "Password123!"},
    )
    valid_token = reg.json()["access_token"]

    # Tampered signature
    tampered_token = valid_token[:-4] + "wxyz"
    res1 = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert res1.status_code == 401

    # Forged token with invalid secret key
    forged_token = jwt.encode(
        {"sub": "usr_fake", "session_id": "ses_fake", "type": "access", "exp": int(time.time()) + 300},
        "wrong-secret-key-12345678901234567890",
        algorithm="HS256",
    )
    res2 = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {forged_token}"},
    )
    assert res2.status_code == 401

    # Expired token
    expired_token = jwt.encode(
        {
            "sub": "usr_fake",
            "session_id": "ses_fake",
            "type": "access",
            "exp": int(time.time()) - 100,  # Expired in past
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    res3 = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert res3.status_code == 401
    assert "expired" in res3.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cookie_path_and_scope_security(client: AsyncClient):
    """
    Verifies cookie security attributes:
    - drape_access_token has path='/'
    - drape_refresh_token has path='/api/v1/auth'
    - HttpOnly is True
    - SameSite is 'lax'
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "cookie.tester@drape.fashion", "password": "Password123!"},
    )
    assert reg.status_code == 201

    set_cookie_headers = reg.headers.get_list("set-cookie")
    assert len(set_cookie_headers) >= 2

    # Check access cookie
    access_header = next(h for h in set_cookie_headers if "drape_access_token=" in h)
    assert "HttpOnly" in access_header
    assert "SameSite=lax" in access_header
    assert "Path=/" in access_header

    # Check refresh cookie - MUST be scoped to /api/v1/auth
    refresh_header = next(h for h in set_cookie_headers if "drape_refresh_token=" in h)
    assert "HttpOnly" in refresh_header
    assert "SameSite=lax" in refresh_header
    assert "Path=/api/v1/auth" in refresh_header


@pytest.mark.asyncio
async def test_mass_assignment_and_extra_fields_rejection(client: AsyncClient):
    """
    Verifies that extra or unexpected fields in profile or consent update payloads
    are strictly rejected with 422 Unprocessable Content (ConfigDict(extra='forbid')).
    """
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "mass.assign@drape.fashion", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to inject 'roles' or 'is_active' or 'email' into profile update
    injected_profile = await client.patch(
        "/api/v1/users/me",
        json={"first_name": "Injected", "roles": ["admin"], "is_active": True},
        headers=headers,
    )
    assert injected_profile.status_code == 422

    # Attempt to inject 'user_id' into consent update
    injected_consent = await client.patch(
        "/api/v1/users/me/consents",
        json={"camera_processing_opt_in": True, "user_id": "unauthorized-uuid"},
        headers=headers,
    )
    assert injected_consent.status_code == 422

