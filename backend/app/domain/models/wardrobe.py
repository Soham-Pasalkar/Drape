"""
DRAPE Smart Digital Wardrobe & Outfits Domain Models.

Defines:
1. WardrobeItem: Individual clothing garment owned by customer (purchased or manual).
2. Outfit: Saved combination of wardrobe items.
3. OutfitItem: Ordered association entity linking outfits to wardrobe items.
"""

from datetime import datetime
from typing import List, Optional
import uuid

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def generate_uuid() -> str:
    """Generates standard UUID v4 string identifier."""
    return str(uuid.uuid4())


class WardrobeItem(Base):
    """
    Represents an individual clothing item owned by a customer.
    Can be sourced from a DRAPE purchase or entered manually.
    """

    __tablename__ = "wardrobe_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    order_item_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("order_items.id", ondelete="SET NULL"),
        unique=True,
        index=True,
        nullable=True,
    )
    source: Mapped[str] = mapped_column(
        String(32),
        default="manual",
        index=True,
        nullable=False,
    )  # "purchased" | "manual"
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    brand: Mapped[Optional[str]] = mapped_column(
        String(100),
        default="DRAPE Atelier",
        nullable=True,
    )
    category: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )  # coats, jackets, shirts, trousers, knitwear, accessories, etc.
    subcategory: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    color: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    secondary_color: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    size: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    material: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    season: Mapped[Optional[str]] = mapped_column(
        String(50),
        index=True,
        nullable=True,
    )  # spring, summer, autumn, winter, all-season
    occasion: Mapped[Optional[str]] = mapped_column(
        String(50),
        index=True,
        nullable=True,
    )  # formal, casual, business, evening, atelier
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    purchase_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="wardrobe_items")
    product: Mapped[Optional["Product"]] = relationship("Product")
    order_item: Mapped[Optional["OrderItem"]] = relationship("OrderItem")
    outfit_associations: Mapped[List["OutfitItem"]] = relationship(
        "OutfitItem",
        back_populates="wardrobe_item",
        cascade="all, delete-orphan",
    )


class Outfit(Base):
    """Represents a curated, saved combination of wardrobe items."""

    __tablename__ = "outfits"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    occasion: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    season: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    cover_image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="outfits")
    items: Mapped[List["OutfitItem"]] = relationship(
        "OutfitItem",
        back_populates="outfit",
        cascade="all, delete-orphan",
        order_by="OutfitItem.display_order",
    )


class OutfitItem(Base):
    """Ordered junction association between Outfits and WardrobeItems."""

    __tablename__ = "outfit_items"
    __table_args__ = (
        UniqueConstraint("outfit_id", "wardrobe_item_id", name="uq_outfit_wardrobe_item"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    outfit_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("outfits.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    wardrobe_item_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("wardrobe_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    outfit: Mapped["Outfit"] = relationship("Outfit", back_populates="items")
    wardrobe_item: Mapped["WardrobeItem"] = relationship(
        "WardrobeItem",
        back_populates="outfit_associations",
    )

