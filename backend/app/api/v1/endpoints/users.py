"""
DRAPE Protected Customer Profile & Consent Endpoints.

Implements /api/v1/users/me and /api/v1/users/me/consents endpoints.
Ensures users can only read or modify their own profile and independent preferences.
Conforms to PRD FR-006, SEC-001, SEC-002, and SYSTEM_ARCHITECTURE.md §8.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.v1.schemas.user import (
    UserConsentResponse,
    UserConsentUpdateRequest,
    UserResponse,
    UserUpdateRequest,
)
from app.domain.models.identity import User, UserConsent

router = APIRouter(prefix="/users", tags=["Customer Profiles & Consents"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Retrieve authenticated customer profile",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Returns the profile of the currently authenticated customer."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update customer profile details",
)
async def update_my_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Updates basic personal details for the authenticated customer."""
    if payload.first_name is not None:
        current_user.first_name = payload.first_name.strip() if payload.first_name else None
    if payload.last_name is not None:
        current_user.last_name = payload.last_name.strip() if payload.last_name else None

    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get(
    "/me/consents",
    response_model=UserConsentResponse,
    summary="Retrieve customer privacy & marketing consent preferences",
)
async def get_my_consents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserConsentResponse:
    """Returns all independent privacy and marketing opt-in preferences."""
    result = await db.execute(
        select(UserConsent).where(UserConsent.user_id == current_user.id)
    )
    consent = result.scalar_one_or_none()

    if consent is None:
        # Auto-provision default consent record if absent
        consent = UserConsent(user_id=current_user.id)
        db.add(consent)
        await db.commit()
        await db.refresh(consent)

    return UserConsentResponse.model_validate(consent)


@router.patch(
    "/me/consents",
    response_model=UserConsentResponse,
    summary="Independently modify privacy and marketing consent preferences",
)
async def update_my_consents(
    payload: UserConsentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserConsentResponse:
    """
    Granularly updates one or more consent preferences.
    
    Guarantees that privacy controls (camera/AI) can be modified
    independently of commercial marketing choices.
    """
    result = await db.execute(
        select(UserConsent).where(UserConsent.user_id == current_user.id)
    )
    consent = result.scalar_one_or_none()

    if consent is None:
        consent = UserConsent(user_id=current_user.id)
        db.add(consent)

    if payload.camera_processing_opt_in is not None:
        consent.camera_processing_opt_in = payload.camera_processing_opt_in
    if payload.ai_tryon_storage_opt_in is not None:
        consent.ai_tryon_storage_opt_in = payload.ai_tryon_storage_opt_in
    if payload.marketing_emails_opt_in is not None:
        consent.marketing_emails_opt_in = payload.marketing_emails_opt_in
    if payload.analytics_opt_in is not None:
        consent.analytics_opt_in = payload.analytics_opt_in

    await db.commit()
    await db.refresh(consent)
    return UserConsentResponse.model_validate(consent)

