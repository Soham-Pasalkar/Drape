"""
DRAPE Shopping Cart Pydantic Schemas.

Defines typed request and response contracts for cart creation, item management,
quantity updates, variant switching, and guest cart merging.
Conforms to ADR-001, ADR-002, and Milestone 2 requirements.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AddToCartRequest(BaseModel):
    """Payload to add a product variant to the cart."""

    model_config = ConfigDict(extra="forbid")

    variant_id: str = Field(..., description="Target ProductVariant UUID")
    quantity: int = Field(1, ge=1, le=100, description="Quantity to purchase (1-100)")


class UpdateCartItemRequest(BaseModel):
    """Payload to update an existing cart line item quantity or variant."""

    model_config = ConfigDict(extra="forbid")

    quantity: Optional[int] = Field(None, ge=1, le=100, description="New quantity")
    variant_id: Optional[str] = Field(None, description="Optional variant UUID to switch size/color")


class MergeCartRequest(BaseModel):
    """Payload to merge a guest session cart into an authenticated customer cart."""

    model_config = ConfigDict(extra="forbid")

    guest_token: str = Field(..., description="Client-side guest cart identifier")


class CartItemResponseSchema(BaseModel):
    """Validated line item inside shopping cart with server-side pricing."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    variant_id: str
    product_id: str
    product_name: str
    product_slug: str
    sku: str
    size: str
    color: str
    color_code: Optional[str] = None
    unit_price: float
    currency: str
    quantity: int
    line_total: float
    primary_image: Optional[str] = None
    available_quantity: int
    in_stock: bool


class CartResponseSchema(BaseModel):
    """Comprehensive shopping cart response with server-calculated subtotal."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    guest_token: Optional[str] = None
    items: List[CartItemResponseSchema] = Field(default_factory=list)
    total_items: int
    subtotal: float
    currency: str = "USD"
