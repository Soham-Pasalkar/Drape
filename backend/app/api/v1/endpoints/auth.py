"""
DRAPE Customer Authentication Endpoints.

Implements /api/v1/auth endpoints for customer registration, credential login,
token rotation, and explicit session revocation with HttpOnly cookie support.
Conforms to ADR-001, ADR-002, and SYSTEM_ARCHITECTURE.md §8.
"""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_session,
    get_db,
    get_identity_adapter,
)
from app.api.v1.schemas.auth import (
    AuthTokenResponseSchema,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
)
from app.api.v1.schemas.user import UserResponse
from app.core.config import settings
from app.domain.models.identity import User, UserConsent
from app.domain.ports.identity_port import IdentityPort, UserSession

router = APIRouter(prefix="/auth", tags=["Customer Authentication"])


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
) -> None:
    """Sets secure HttpOnly session cookies for browser clients."""
    access_max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    is_prod = settings.ENVIRONMENT.lower() == "production"

    response.set_cookie(
        key="drape_access_token",
        value=access_token,
        max_age=access_max_age,
        expires=access_max_age,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key="drape_refresh_token",
        value=refresh_token,
        max_age=refresh_max_age,
        expires=refresh_max_age,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/api/v1/auth",
    )


def clear_auth_cookies(response: Response) -> None:
    """Clears HttpOnly session cookies upon logout."""
    response.delete_cookie(key="drape_access_token", path="/")
    response.delete_cookie(key="drape_refresh_token", path="/api/v1/auth")
    response.delete_cookie(key="drape_refresh_token", path="/")


@router.post(
    "/register",
    response_model=AuthTokenResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer account",
)
async def register_customer(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> AuthTokenResponseSchema:
    """
    Creates a new customer account, records initial independent consent preferences,
    and establishes an initial authenticated session.
    """
    normalized_email = payload.email.strip().lower()

    # Prevent duplicate account registration
    existing_result = await db.execute(
        select(User).where(User.email == normalized_email)
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Hash password securely using IdentityPort
    hashed_password = identity.hash_password(payload.password)

    new_user = User(
        email=normalized_email,
        hashed_password=hashed_password,
        first_name=payload.first_name.strip() if payload.first_name else None,
        last_name=payload.last_name.strip() if payload.last_name else None,
        roles=["customer"],
        is_active=True,
    )
    db.add(new_user)
    await db.flush()  # Populates new_user.id

    # Record independent granular consents
    consent = UserConsent(
        user_id=new_user.id,
        camera_processing_opt_in=payload.camera_processing_opt_in,
        ai_tryon_storage_opt_in=payload.ai_tryon_storage_opt_in,
        marketing_emails_opt_in=payload.marketing_emails_opt_in,
        analytics_opt_in=payload.analytics_opt_in,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(new_user)

    # Authenticate credentials and issue session
    token_response = await identity.authenticate_credentials(
        email=normalized_email,
        password=payload.password,
    )

    set_auth_cookies(
        response,
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
    )

    return AuthTokenResponseSchema(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        token_type=token_response.token_type,
        expires_in_seconds=token_response.expires_in_seconds,
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login",
    response_model=AuthTokenResponseSchema,
    summary="Authenticate customer credentials",
)
async def login_customer(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> AuthTokenResponseSchema:
    """Authenticates email and password, creating a persistent session."""
    normalized_email = payload.email.strip().lower()

    try:
        token_response = await identity.authenticate_credentials(
            email=normalized_email,
            password=payload.password,
        )
    except (ValueError, PermissionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Retrieve user profile
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one()

    set_auth_cookies(
        response,
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
    )

    return AuthTokenResponseSchema(
        access_token=token_response.access_token,
        refresh_token=token_response.refresh_token,
        token_type=token_response.token_type,
        expires_in_seconds=token_response.expires_in_seconds,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=AuthTokenResponseSchema,
    summary="Refresh access token using refresh token",
)
async def refresh_customer_session(
    response: Response,
    payload: Optional[RefreshRequest] = None,
    drape_refresh_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> AuthTokenResponseSchema:
    """Rotates refresh token and issues fresh access token."""
    raw_token = payload.refresh_token if payload and payload.refresh_token else drape_refresh_token

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token required in request payload or HttpOnly cookie.",
        )

    try:
        new_token_pair = await identity.refresh_token(raw_token)
    except TimeoutError as exc:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
        ) from exc
    except (PermissionError, ValueError) as exc:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    # Verify session to retrieve user
    session = await identity.verify_token(new_token_pair.access_token)
    result = await db.execute(select(User).where(User.id == session.user_id))
    user = result.scalar_one()

    set_auth_cookies(
        response,
        access_token=new_token_pair.access_token,
        refresh_token=new_token_pair.refresh_token,
    )

    return AuthTokenResponseSchema(
        access_token=new_token_pair.access_token,
        refresh_token=new_token_pair.refresh_token,
        token_type=new_token_pair.token_type,
        expires_in_seconds=new_token_pair.expires_in_seconds,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke active customer session and clear cookies",
)
async def logout_customer(
    response: Response,
    session: UserSession = Depends(get_current_session),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> MessageResponse:
    """Revokes the current session record in PostgreSQL and clears cookies."""
    await identity.revoke_session(session.session_id)
    clear_auth_cookies(response)
    return MessageResponse(message="Successfully logged out of DRAPE session.")

