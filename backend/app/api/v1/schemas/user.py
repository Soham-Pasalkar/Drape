"""
DRAPE User & Consent Pydantic Schemas.

Defines typed request and response contracts for user profile retrieval,
profile modification, and granular consent management.
Conforms to PRD FR-006, SEC-001, and SYSTEM_ARCHITECTURE.md §8.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class UserResponse(BaseModel):
    """Public customer profile response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    roles: List[str]
    created_at: datetime


class UserUpdateRequest(BaseModel):
    """Request payload for updating personal customer details."""

    model_config = ConfigDict(extra="forbid")

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


class UserConsentResponse(BaseModel):
    """Customer consent preferences record."""

    model_config = ConfigDict(from_attributes=True)

    user_id: str
    camera_processing_opt_in: bool
    ai_tryon_storage_opt_in: bool
    marketing_emails_opt_in: bool
    analytics_opt_in: bool
    updated_at: datetime


class UserConsentUpdateRequest(BaseModel):
    """
    Independent consent update payload.
    
    Permits granular opt-in/opt-out for each privacy or marketing dimension
    without requiring all fields or linking privacy to marketing.
    """

    model_config = ConfigDict(extra="forbid")

    camera_processing_opt_in: Optional[bool] = None
    ai_tryon_storage_opt_in: Optional[bool] = None
    marketing_emails_opt_in: Optional[bool] = None
    analytics_opt_in: Optional[bool] = None

