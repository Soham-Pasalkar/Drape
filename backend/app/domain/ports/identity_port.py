"""
DRAPE Domain Port: Identity & Authentication.

Defines the abstract interface for user authentication, token issuance,
session revocation, and identity verification.
Conforms to docs/architecture/interfaces/identity_port.md.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass(frozen=True)
class UserSession:
    """Represents an authenticated customer or operator session."""
    user_id: str
    session_id: str
    email: str
    roles: List[str]
    created_at: datetime
    expires_at: datetime


@dataclass(frozen=True)
class AuthTokenResponse:
    """Standardized response from token authentication."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in_seconds: int = 900  # 15 minutes


class IdentityPort(ABC):
    """
    Abstract Port for Identity and Session Management.
    
    Decouples core DRAPE domains from specific identity providers
    (e.g. self-hosted JWT, Supabase Auth, Clerk, Auth0).
    """

    @abstractmethod
    async def authenticate_credentials(
        self, email: str, password: str
    ) -> AuthTokenResponse:
        """Authenticates user credentials and issues token pair."""
        pass

    @abstractmethod
    async def verify_token(self, token: str) -> UserSession:
        """Verifies JWT signature and checks session validity."""
        pass

    @abstractmethod
    async def revoke_session(self, session_id: str) -> bool:
        """Revokes a session by invalidating the refresh token/session record."""
        pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> AuthTokenResponse:
        """Exchanges a valid refresh token for a fresh token pair."""
        pass

    @abstractmethod
    def hash_password(self, password: str) -> str:
        """Hashes plaintext password with secure salt."""
        pass

    @abstractmethod
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifies plaintext password against stored hash."""
        pass

    @abstractmethod
    async def revoke_all_user_sessions(self, user_id: str) -> bool:
        """Revokes all active sessions for a user."""
        pass

