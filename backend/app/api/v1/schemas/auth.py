"""
DRAPE Authentication Pydantic Schemas.

Defines typed request and response contracts for registration, login,
token refresh, session termination, and token issuance.
Conforms to ADR-001 and SYSTEM_ARCHITECTURE.md §8.
"""

import re
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.v1.schemas.user import UserResponse

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class RegisterRequest(BaseModel):
    """Customer account registration payload."""

    email: str = Field(..., description="Customer primary email address.")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must contain at least 8 characters.",
    )
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)

    # Initial optional privacy & marketing consents
    camera_processing_opt_in: bool = Field(
        False, description="Explicit opt-in for live camera drape processing."
    )
    ai_tryon_storage_opt_in: bool = Field(
        False, description="Opt-in for storing synthesized AI try-on looks."
    )
    marketing_emails_opt_in: bool = Field(
        False, description="Opt-in for editorial releases and news."
    )
    analytics_opt_in: bool = Field(
        False, description="Opt-in for anonymous product analytics."
    )

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email address format.")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class LoginRequest(BaseModel):
    """Customer credentials login payload."""

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email address format.")
        return cleaned


class RefreshRequest(BaseModel):
    """Session token refresh payload."""

    refresh_token: Optional[str] = Field(
        None,
        description="Refresh token if not transmitted via HttpOnly cookie.",
    )


class AuthTokenResponseSchema(BaseModel):
    """Authentication success response containing tokens and customer profile."""

    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in_seconds: int
    user: UserResponse


class MessageResponse(BaseModel):
    """Standard message response for actions such as logout."""

    message: str

