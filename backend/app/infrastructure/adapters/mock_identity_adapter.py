"""
Mock Identity Adapter for Local Development and Testing.

Implements IdentityPort with in-memory tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict
from app.domain.ports.identity_port import (
    IdentityPort,
    AuthTokenResponse,
    UserSession,
)


class MockIdentityAdapter(IdentityPort):
    def __init__(self) -> None:
        self._revoked_sessions: Dict[str, bool] = {}

    async def authenticate_credentials(
        self, email: str, password: str
    ) -> AuthTokenResponse:
        return AuthTokenResponse(
            access_token=f"mock_access_token_for_{email}",
            refresh_token=f"mock_refresh_token_for_{email}",
            expires_in_seconds=900,
        )

    async def verify_token(self, token: str) -> UserSession:
        if "mock_access_token_for_" not in token:
            raise ValueError("Invalid mock token")
        email = token.replace("mock_access_token_for_", "")
        session_id = f"mock_session_{email}"
        if self._revoked_sessions.get(session_id, False):
            raise PermissionError("Session has been revoked")

        now = datetime.now(timezone.utc)
        return UserSession(
            user_id="usr_01mockuser0000000000001",
            session_id=session_id,
            email=email,
            roles=["customer"],
            created_at=now,
            expires_at=now + timedelta(minutes=15),
        )

    async def revoke_session(self, session_id: str) -> bool:
        self._revoked_sessions[session_id] = True
        return True

    async def refresh_token(self, refresh_token: str) -> AuthTokenResponse:
        return AuthTokenResponse(
            access_token="mock_refreshed_access_token",
            refresh_token="mock_new_refresh_token",
            expires_in_seconds=900,
        )

    def hash_password(self, password: str) -> str:
        return f"mock_hashed_{password}"

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return hashed_password == f"mock_hashed_{plain_password}"

    async def revoke_all_user_sessions(self, user_id: str) -> bool:
        return True

