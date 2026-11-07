"""
SQLAlchemy & JWT Production Identity Adapter.

Implements IdentityPort backed by PostgreSQL / SQLAlchemy, bcrypt password
hashing, and cryptographic JWT access/refresh token rotation with centralized
session revocation in the user_sessions table.
Conforms to ADR-001, ADR-002, and docs/architecture/interfaces/identity_port.md.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Callable
import bcrypt
import jwt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domain.models.identity import User, UserSession as DBUserSession
from app.domain.ports.identity_port import (
    IdentityPort,
    AuthTokenResponse,
    UserSession,
)

# Constant dummy hash for constant-time email enumeration resistance
DUMMY_BCRYPT_HASH = (
    "$2b$12$e8x6sY5xJ7hDk4gL8nPQmO5p4z5e6r7t8y9u0i1o2p3a4s5d6f7g8"
)


class SqlAlchemyIdentityAdapter(IdentityPort):
    """Production Identity Adapter backed by PostgreSQL and SQLAlchemy."""

    def __init__(
        self,
        session_factory: Callable[[], AsyncSession] = AsyncSessionLocal,
    ) -> None:
        self.session_factory = session_factory
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.issuer = settings.JWT_ISSUER
        self.audience = settings.JWT_AUDIENCE
        self.leeway = settings.JWT_LEEWAY_SECONDS
        self.access_token_expire_minutes = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = settings.REFRESH_TOKEN_EXPIRE_DAYS

    def hash_password(self, password: str) -> str:
        """Hashes password with bcrypt and a cryptographically secure salt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verifies plain password against stored bcrypt hash."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    def _hash_token(self, token: str) -> str:
        """Returns SHA-256 hash of refresh token for database storage."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def _create_tokens(
        self,
        user_id: str,
        email: str,
        roles: list[str],
        session_id: str,
    ) -> tuple[str, str, datetime]:
        """Generates access and refresh JWT pair."""
        now = datetime.now(timezone.utc)
        access_exp = now + timedelta(minutes=self.access_token_expire_minutes)
        refresh_exp = now + timedelta(days=self.refresh_token_expire_days)

        access_payload = {
            "sub": user_id,
            "email": email,
            "roles": roles,
            "session_id": session_id,
            "jti": str(uuid.uuid4()),
            "type": "access",
            "iat": int(now.timestamp()),
            "exp": int(access_exp.timestamp()),
        }
        if self.issuer:
            access_payload["iss"] = self.issuer
        if self.audience:
            access_payload["aud"] = self.audience

        access_token = jwt.encode(
            access_payload,
            self.secret_key,
            algorithm=self.algorithm,
        )

        refresh_payload = {
            "sub": user_id,
            "session_id": session_id,
            "jti": str(uuid.uuid4()),
            "type": "refresh",
            "iat": int(now.timestamp()),
            "exp": int(refresh_exp.timestamp()),
        }
        if self.issuer:
            refresh_payload["iss"] = self.issuer
        if self.audience:
            refresh_payload["aud"] = self.audience

        refresh_token = jwt.encode(
            refresh_payload,
            self.secret_key,
            algorithm=self.algorithm,
        )

        return access_token, refresh_token, refresh_exp

    async def authenticate_credentials(
        self, email: str, password: str
    ) -> AuthTokenResponse:
        """Validates credentials against PostgreSQL and issues persistent session."""
        normalized_email = email.strip().lower()

        async with self.session_factory() as db:
            result = await db.execute(
                select(User).where(User.email == normalized_email)
            )
            user = result.scalar_one_or_none()

            if user is None:
                # Timing attack prevention
                self.verify_password(password, DUMMY_BCRYPT_HASH)
                raise ValueError("Invalid email or password.")

            if not user.is_active:
                raise PermissionError("Account is inactive.")

            if not self.verify_password(password, user.hashed_password):
                raise ValueError("Invalid email or password.")

            # Issue session
            session_id = str(uuid.uuid4())
            access_token, refresh_token, refresh_exp = self._create_tokens(
                user_id=user.id,
                email=user.email,
                roles=user.roles,
                session_id=session_id,
            )

            # Persist session in PostgreSQL
            db_session = DBUserSession(
                id=session_id,
                user_id=user.id,
                refresh_token_hash=self._hash_token(refresh_token),
                is_revoked=False,
                expires_at=refresh_exp,
            )
            db.add(db_session)
            await db.commit()

            return AuthTokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="Bearer",
                expires_in_seconds=self.access_token_expire_minutes * 60,
            )

    async def verify_token(self, token: str) -> UserSession:
        """Verifies JWT signature and checks session revocation in PostgreSQL."""
        decode_kwargs = {
            "algorithms": [self.algorithm],
            "leeway": self.leeway,
        }
        if self.issuer:
            decode_kwargs["issuer"] = self.issuer
        if self.audience:
            decode_kwargs["audience"] = self.audience

        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                **decode_kwargs,
            )
        except jwt.ExpiredSignatureError:
            raise TimeoutError("Token has expired.")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid authentication token.")

        if payload.get("type") != "access":
            raise ValueError("Invalid token type. Expected access token.")

        session_id = payload.get("session_id")
        user_id = payload.get("sub")

        if not session_id or not user_id:
            raise ValueError("Malformed token claims.")

        async with self.session_factory() as db:
            # Check session revocation status
            session_result = await db.execute(
                select(DBUserSession).where(DBUserSession.id == session_id)
            )
            db_session = session_result.scalar_one_or_none()

            if not db_session:
                raise PermissionError("Session not found or has been revoked.")

            if db_session.is_revoked:
                raise PermissionError("Session has been revoked.")

            now = datetime.now(timezone.utc)
            # Normalize timezone comparison if needed
            expires_at = db_session.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at < now:
                raise PermissionError("Session has expired.")

            # Check user status
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user or not user.is_active:
                raise PermissionError("User account is inactive or not found.")

            created_at = db_session.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            return UserSession(
                user_id=user.id,
                session_id=session_id,
                email=user.email,
                roles=user.roles,
                created_at=created_at,
                expires_at=expires_at,
            )

    async def revoke_session(self, session_id: str) -> bool:
        """Invalidates a specific session by setting is_revoked = True."""
        async with self.session_factory() as db:
            result = await db.execute(
                update(DBUserSession)
                .where(DBUserSession.id == session_id)
                .values(is_revoked=True)
            )
            await db.commit()
            return result.rowcount > 0

    async def revoke_all_user_sessions(self, user_id: str) -> bool:
        """Revokes all active sessions for a user."""
        async with self.session_factory() as db:
            result = await db.execute(
                update(DBUserSession)
                .where(DBUserSession.user_id == user_id)
                .values(is_revoked=True)
            )
            await db.commit()
            return result.rowcount > 0

    async def refresh_token(self, refresh_token: str) -> AuthTokenResponse:
        """Validates refresh token, checks session, and issues rotated token pair."""
        decode_kwargs = {
            "algorithms": [self.algorithm],
            "leeway": self.leeway,
        }
        if self.issuer:
            decode_kwargs["issuer"] = self.issuer
        if self.audience:
            decode_kwargs["audience"] = self.audience

        try:
            payload = jwt.decode(
                refresh_token,
                self.secret_key,
                **decode_kwargs,
            )
        except jwt.ExpiredSignatureError:
            raise TimeoutError("Refresh token has expired.")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid refresh token.")

        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type. Expected refresh token.")

        session_id = payload.get("session_id")
        user_id = payload.get("sub")

        if not session_id or not user_id:
            raise ValueError("Malformed refresh token claims.")

        token_hash = self._hash_token(refresh_token)

        async with self.session_factory() as db:
            session_result = await db.execute(
                select(DBUserSession).where(DBUserSession.id == session_id)
            )
            db_session = session_result.scalar_one_or_none()

            if not db_session or db_session.is_revoked:
                raise PermissionError("Session has been revoked or is invalid.")

            if db_session.refresh_token_hash != token_hash:
                # Potential token reuse attack - revoke session for safety
                db_session.is_revoked = True
                await db.commit()
                raise PermissionError("Refresh token reuse detected. Session revoked.")

            now = datetime.now(timezone.utc)
            expires_at = db_session.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)

            if expires_at < now:
                raise PermissionError("Session has expired.")

            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user or not user.is_active:
                raise PermissionError("User account is inactive or not found.")

            # Rotate tokens
            new_access_token, new_refresh_token, new_refresh_exp = (
                self._create_tokens(
                    user_id=user.id,
                    email=user.email,
                    roles=user.roles,
                    session_id=session_id,
                )
            )

            # Update session in DB
            db_session.refresh_token_hash = self._hash_token(new_refresh_token)
            db_session.expires_at = new_refresh_exp
            await db.commit()

            return AuthTokenResponse(
                access_token=new_access_token,
                refresh_token=new_refresh_token,
                token_type="Bearer",
                expires_in_seconds=self.access_token_expire_minutes * 60,
            )
