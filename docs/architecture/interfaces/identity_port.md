# Hexagonal Domain Port: IdentityPort

**Document:** Domain Port Specification — Authentication & Account Lifecycle  
**Port Name:** `IdentityPort`  
**Domain:** `drape.identity`  
**Status:** **AUTHORITATIVE ARCHITECTURAL SPECIFICATION**  
**Blocking Milestone:** M1 (Scaffold) / M2 (E-Commerce Foundation)  
**Related Open Decisions:** [`DEC-IDN-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-idn-001), [`DEC-IDN-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-idn-002), [`DEC-IDN-003`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-idn-003)

---

## 1. Domain Purpose & Boundary

The `IdentityPort` defines the authentication and account lifecycle interface for DRAPE. It isolates customer identity verification, credential hashing, token lifecycle management, and social logins from the internal user profile and wardrobe business domains.

This boundary allows DRAPE to begin with a clean self-hosted authentication service in Milestone 1 while preserving the architectural flexibility to switch to a managed provider (e.g. Supabase Auth, Clerk, Auth0) or add biometric passkeys without rewriting customer or order relationships.

---

## 2. What This Port Abstracts vs. What It CANNOT Abstract

### What It Abstracts (Replaceable Technical Integration):
* Customer credential validation (passwords via Argon2id, magic links, social OAuth2 tokens).
* Generation, cryptographic verification, and refresh of session access tokens (JWTs) and refresh tokens.
* Coordinated token revocation and cross-device session invalidation workflows.

### What It CANNOT Abstract (Preserved Real-World Dependencies):
* **Minimum Age Policy & Age Gating ([`DEC-IDN-002`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-idn-002)):** A software interface cannot decide whether DRAPE permits users aged 13+, 16+, or 18+, or whether physical age verification is legally mandated before try-on photo upload under COPPA or GDPR Art. 8.
* **Governing Privacy Jurisdictions ([`DEC-PRV-001`](file:///Users/soham/Github/Drape/docs/aidlc/OPEN_DECISIONS_REGISTER.md#dec-prv-001)):** Legal determination of applicable privacy laws and DPIA execution remain external legal mandates.

---

## 3. Failure Behavior, Security Boundaries & Distributed Token Semantics

### Failure Behavior & Domain Exceptions
* **`InvalidCredentialsError`:** Raised when email/password or social token validation fails. Enforces timing-attack resistance via constant-time dummy hashing on unknown emails.
* **`SessionRevokedError`:** Raised when an access token belongs to a session explicitly invalidated in the denylist.
* **`TokenExpiredError`:** Raised on expired access tokens, prompting standard refresh token exchange.
* **`AccountLockedError`:** Raised when brute-force rate limit thresholds are exceeded (e.g. >5 consecutive failed attempts per IP/account).

### Distributed Token Lifecycle & Revocation Limitations
Session management in a distributed web platform involves fundamental trade-offs:
* **Stateless Verification vs. Instant Revocation:** Stateless JWTs permit fast signature verification without database lookups. However, immediate cross-device session revocation requires checking a centralized session denylist (e.g. Redis or database table) on every authenticated request. Consequently, revocation propagation is subject to cache replication latency and cannot be described as an instantaneous physical guarantee.
* **Clock Skew:** Token expiration checks must tolerate minor NTP clock skew (e.g. 30–60 second leeway) between API gateway instances and client clocks.
* **Refresh Token Rotation & Race Handling:** Refresh tokens are single-use with rotation. However, concurrent requests from a mobile client on flaky cellular networks can cause race conditions. Production adapters must implement a short grace period (e.g. 10–15 seconds) where the prior refresh token is accepted only once to prevent accidental account lockout during normal network retries.

---

## 4. Abstract Interface Definition (Python / Typing)

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


@dataclass(frozen=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    access_token_expires_at: datetime
    token_type: str = "Bearer"


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str
    is_active: bool
    roles: List[str]
    session_id: str


class IdentityPort(ABC):
    """Hexagonal port for authentication, token issuance, and session lifecycle."""

    @abstractmethod
    async def authenticate_email_password(
        self, email: str, password: str
    ) -> Optional[AuthTokens]:
        """Validates credentials and issues an authenticated session token pair."""
        pass

    @abstractmethod
    async def authenticate_social_token(
        self, provider: str, id_token: str
    ) -> Optional[AuthTokens]:
        """Validates external social tokens (Google, Apple) and provisions/authenticates user."""
        pass

    @abstractmethod
    async def refresh_session(self, refresh_token: str) -> Optional[AuthTokens]:
        """Rotates refresh tokens and issues fresh access tokens."""
        pass

    @abstractmethod
    async def verify_access_token(self, access_token: str) -> Optional[AuthenticatedUser]:
        """Cryptographically verifies an access token and checks session denylist."""
        pass

    @abstractmethod
    async def revoke_session(self, session_id: str) -> bool:
        """Immediately invalidates a specific user session."""
        pass

    @abstractmethod
    async def revoke_all_user_sessions(self, user_id: str) -> bool:
        """Globally invalidates all active sessions for a user (e.g. on password reset or account compromise)."""
        pass
```

---

## 5. Planned Adapters

### 5.1 Production Adapters
1. **`FastAPISelfHostedAuthAdapter` (Provisional Baseline Candidate):** In-house JWT authentication using Argon2id password hashing and candidate session denylist.
2. **`ManagedIdPAdapter` (Conditional Candidate):** Connects to managed auth providers (Supabase Auth / Clerk) if early operations warrant delegating identity infrastructure.

### 5.2 Test Adapters (Test Environment Only)
1. **`MockIdentityAdapter`:** Bypasses crypto verification for fast unit and integration testing in CI/CD pipelines. Never loaded in production.

