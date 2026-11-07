"""
DRAPE Pydantic Schemas: Checkout Quotes & Order Placement.

Validates server-side calculated pricing quotes, delivery options, and order placement.
Conforms to ADR-001, ADR-002, and PRD checkout specifications.
"""

from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.api.v1.schemas.address import AddressCreateSchema


class ShippingOption(BaseModel):
    """Available delivery tier with calculation details."""
    id: str = Field(..., description="Method code: standard, express, atelier")
    name: str = Field(..., description="Display title")
    description: str = Field(..., description="Delivery timeline and perks")
    amount: Decimal = Field(..., description="Delivery charge")
    currency: str = Field(default="USD")
    estimated_days: str = Field(..., description="Delivery window in business days")
    is_free: bool = Field(default=False)


class TaxBreakdownItem(BaseModel):
    """Tax details for jurisdiction."""
    jurisdiction: str
    rate: float
    amount: Decimal


class CheckoutQuoteRequest(BaseModel):
    """Payload to calculate real-time delivery charges, taxes, and totals."""
    shipping_address_id: Optional[str] = Field(None, description="Saved address ID")
    shipping_address: Optional[AddressCreateSchema] = Field(None, description="Inline address if guest or new")
    shipping_method: Optional[str] = Field(default="standard", description="Selected shipping method")
    guest_token: Optional[str] = Field(None, description="Guest cart token if anonymous")


class CheckoutQuoteResponse(BaseModel):
    """Server-validated pricing breakdown for checkout review."""
    currency: str = "USD"
    subtotal: Decimal
    shipping_amount: Decimal
    selected_shipping_method: str
    shipping_options: List[ShippingOption]
    tax_amount: Decimal
    tax_breakdown: List[TaxBreakdownItem]
    discount_amount: Decimal = Decimal("0.00")
    total_amount: Decimal
    item_count: int
    is_free_shipping_eligible: bool = False


class CreateOrderRequest(BaseModel):
    """Payload to convert cart into a pending order."""
    shipping_address_id: Optional[str] = Field(None, description="Saved address ID")
    shipping_address: Optional[AddressCreateSchema] = Field(None, description="Inline delivery address")
    shipping_method: str = Field(default="standard", description="Selected shipping method code")
    customer_notes: Optional[str] = Field(None, max_length=500, description="Special instructions")
    guest_token: Optional[str] = Field(None, description="Guest cart token if applicable")

