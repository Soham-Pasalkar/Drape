"""
DRAPE Smart Digital Wardrobe & Outfits Domain Models.

Defines:
1. WardrobeItem: Individual clothing garment owned by customer (purchased or manual).
2. Outfit: Saved combination of wardrobe items.
3. OutfitItem: Ordered association entity linking outfits to wardrobe items.
"""

from datetime import date, datetime
from typing import List, Optional
import uuid

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
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


class StylistPreferences(Base):
    """Customer styling preferences for the DRAPE AI/Deterministic Stylist."""

    __tablename__ = "stylist_preferences"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    style_direction: Mapped[str] = mapped_column(
        String(64),
        default="contemporary_minimal",
        nullable=False,
    )  # contemporary_minimal, classic_tailoring, relaxed_casual, avant_garde, monochrome
    favorite_occasions: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )  # casual, office, evening, formal, weekend
    favorite_colors: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )  # e.g. ["black", "navy", "white", "beige"]
    excluded_colors: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    preferred_season: Mapped[Optional[str]] = mapped_column(
        String(50),
        default="all-season",
        nullable=True,
    )
    rotation_strategy: Mapped[str] = mapped_column(
        String(32),
        default="balanced",
        nullable=False,
    )  # balanced | avoid_recent | max_variety
    inferred_favorites: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )  # e.g. {"preferred_palettes": [...], "top_combinations": [...]}
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

    user: Mapped["User"] = relationship("User", backref="stylist_preferences")


class OutfitFeedback(Base):
    """Customer interaction and feedback on generated outfit recommendations."""

    __tablename__ = "outfit_feedback"

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
    outfit_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("outfits.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    recommendation_hash: Mapped[Optional[str]] = mapped_column(
        String(128),
        index=True,
        nullable=True,
    )
    action: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
    )  # like, dislike, save, skip, worn
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", backref="outfit_feedback")
    outfit: Mapped[Optional["Outfit"]] = relationship("Outfit")


class WearLog(Base):
    """
    Historical log of an outfit or garment combination worn on a specific date.
    Tracks wear frequency, rotation health, and repeat prevention.
    """

    __tablename__ = "wear_logs"

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
    wear_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )
    outfit_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("outfits.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    occasion: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="wear_logs")
    outfit: Mapped[Optional["Outfit"]] = relationship("Outfit")
    items: Mapped[List["WearLogItem"]] = relationship(
        "WearLogItem",
        back_populates="wear_log",
        cascade="all, delete-orphan",
        order_by="WearLogItem.display_order",
    )


class WearLogItem(Base):
    """
    Immutable snapshot of an individual garment worn as part of a WearLog.
    Preserves garment appearance and metadata even if the original item is removed.
    """

    __tablename__ = "wear_log_items"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=generate_uuid,
    )
    wear_log_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("wear_logs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    wardrobe_item_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("wardrobe_items.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    garment_name_snapshot: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    category_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    color_snapshot: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    image_url_snapshot: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    wear_log: Mapped["WearLog"] = relationship("WearLog", back_populates="items")
    wardrobe_item: Mapped[Optional["WardrobeItem"]] = relationship("WardrobeItem")


class OutfitPlan(Base):
    """
    Scheduled outfit planned for a specific upcoming calendar date and occasion.
    Can be marked as worn to convert into a permanent WearLog.
    """

    __tablename__ = "outfit_plans"

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
    plan_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )
    outfit_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("outfits.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    occasion: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="planned",
        index=True,
        nullable=False,
    )  # "planned" | "worn" | "cancelled"
    items: Mapped[List[dict]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )  # list of { wardrobe_item_id, name, category, color, image_url }
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

    user: Mapped["User"] = relationship("User", backref="outfit_plans")
    outfit: Mapped[Optional["Outfit"]] = relationship("Outfit")



