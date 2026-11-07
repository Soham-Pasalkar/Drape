"""
DRAPE Catalog Pydantic Schemas.

Defines public typed request and response schemas for product catalog browsing,
faceted filtering, multi-image galleries, and variant stock availability.
Conforms to ADR-001, ADR-007, and Milestone 2 requirements.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductImageSchema(BaseModel):
    """Product gallery image."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    image_url: str
    alt_text: Optional[str] = None
    display_order: int = 0
    is_primary: bool = False


class ColorOptionSchema(BaseModel):
    """Summary of an available colour variant with hex code."""

    name: str
    code: Optional[str] = None


class ProductVariantSchema(BaseModel):
    """Specific SKU variant with real-time inventory quantity."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    sku: str
    size: str
    color: str
    color_code: Optional[str] = None
    is_active: bool = True
    available_quantity: int = 0
    in_stock: bool = True


class ProductSummarySchema(BaseModel):
    """Concise product representation for grid/listing pages."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    category: str
    brand: str
    price: float
    currency: str
    material: Optional[str] = None
    description: Optional[str] = None
    featured: bool = False
    primary_image: Optional[str] = None
    available_colors: List[ColorOptionSchema] = Field(default_factory=list)
    available_sizes: List[str] = Field(default_factory=list)
    in_stock: bool = True
    try_on_enabled: bool = False


class ProductDetailSchema(BaseModel):
    """Exhaustive product details including images, variants, and 3D status."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: str
    category: str
    brand: str
    price: float
    currency: str
    material: Optional[str] = None
    care_instructions: Optional[str] = None
    featured: bool = False
    is_active: bool = True

    # Virtual Try-On 3D Compatibility (Future)
    model_3d_url: Optional[str] = None
    model_3d_format: Optional[str] = None
    model_3d_status: Optional[str] = "pending"
    try_on_enabled: bool = False

    images: List[ProductImageSchema] = Field(default_factory=list)
    variants: List[ProductVariantSchema] = Field(default_factory=list)
    created_at: datetime


class ProductListResponseSchema(BaseModel):
    """Paginated product list response with facet metadata."""

    items: List[ProductSummarySchema]
    total: int
    page: int
    page_size: int
    total_pages: int
    categories: List[str] = Field(default_factory=list)


class CategoryItemSchema(BaseModel):
    """Category navigation summary."""

    name: str
    slug: str
    count: int
