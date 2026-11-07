"""
DRAPE Pydantic Schemas: Customer Address Management.

Validates address creation, mutation, and serialized representation conforming to
Pydantic v2 and ADR-002.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AddressBaseSchema(BaseModel):
    """Base fields for customer address validation."""
    full_name: str = Field(..., min_length=2, max_length=255, description="Recipient full name")
    phone: str = Field(..., min_length=5, max_length=50, description="Contact phone number")
    line1: str = Field(..., min_length=2, max_length=255, description="Street address line 1")
    line2: Optional[str] = Field(None, max_length=255, description="Apartment, suite, or unit")
    city: str = Field(..., min_length=1, max_length=100, description="City or municipality")
    state: str = Field(..., min_length=1, max_length=100, description="State, province, or region")
    postal_code: str = Field(..., min_length=2, max_length=20, description="Postal or ZIP code")
    country: str = Field(default="United States", min_length=2, max_length=100, description="Country name")
    address_type: str = Field(default="home", description="Address type: home, work, other")
    is_default: bool = Field(default=False, description="Whether this is the default shipping address")


class AddressCreateSchema(AddressBaseSchema):
    """Payload for creating a new address."""
    pass


class AddressUpdateSchema(BaseModel):
    """Payload for modifying an existing address."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    line1: Optional[str] = Field(None, min_length=2, max_length=255)
    line2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    state: Optional[str] = Field(None, min_length=1, max_length=100)
    postal_code: Optional[str] = Field(None, min_length=2, max_length=20)
    country: Optional[str] = Field(None, min_length=2, max_length=100)
    address_type: Optional[str] = None
    is_default: Optional[bool] = None


class AddressResponseSchema(AddressBaseSchema):
    """Serialized address representation returned by API."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

