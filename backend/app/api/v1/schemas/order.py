"""
DRAPE Pydantic Schemas: Orders & Historical Item Snapshots.

Serializes Order details, immutable item snapshots, state machine transitions,
and payment transactions.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OrderItemResponse(BaseModel):
    """Historical product snapshot item."""
    id: str
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    product_name: str
    sku: str
    size: str
    color: str
    image_url: Optional[str] = None
    unit_price: Decimal
    quantity: int
    line_total: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderStatusHistoryResponse(BaseModel):
    """State transition log entry."""
    id: str
    from_status: Optional[str] = None
    to_status: str
    reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentSummaryResponse(BaseModel):
    """Transaction summary for an order."""
    id: str
    provider: str
    provider_order_id: Optional[str] = None
    provider_payment_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: str
    failure_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    """Comprehensive order representation."""
    id: str
    order_number: str
    status: str
    payment_status: str
    currency: str
    subtotal: Decimal
    shipping_amount: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    shipping_method: str
    shipping_address_snapshot: Dict[str, Any]
    customer_notes: Optional[str] = None
    expires_at: Optional[datetime] = None
    items: List[OrderItemResponse] = Field(default_factory=list)
    payments: List[PaymentSummaryResponse] = Field(default_factory=list)
    status_history: List[OrderStatusHistoryResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderListResponse(BaseModel):
    """List of orders for customer history."""
    orders: List[OrderResponse]
    total: int

