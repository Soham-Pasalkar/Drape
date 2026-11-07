"""
DRAPE Pydantic Schemas: Smart Digital Wardrobe & Outfits.

Validates input for manual wardrobe items, purchased item imports, and outfit curation.
Conforms to Pydantic v2 and ADR-001 conventions.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WardrobeItemBase(BaseModel):
    """Shared wardrobe item attributes."""
    name: str = Field(..., min_length=1, max_length=255, description="Garment display name")
    brand: Optional[str] = Field("DRAPE Atelier", max_length=100, description="Brand or atelier label")
    category: str = Field(..., min_length=1, max_length=100, description="Primary category, e.g. coats, jackets, shirts")
    subcategory: Optional[str] = Field(None, max_length=100, description="Fine-grained category, e.g. trench, blouson")
    description: Optional[str] = Field(None, description="Detailed item styling notes")
    color: str = Field(..., min_length=1, max_length=100, description="Primary color")
    secondary_color: Optional[str] = Field(None, max_length=100, description="Secondary or accent color")
    size: Optional[str] = Field(None, max_length=50, description="Sizing specification")
    material: Optional[str] = Field(None, max_length=255, description="Fabric composition")
    season: Optional[str] = Field(None, max_length=50, description="Target season, e.g. autumn, winter, all-season")
    occasion: Optional[str] = Field(None, max_length=50, description="Styling occasion, e.g. evening, casual, atelier")
    image_url: Optional[str] = Field(None, max_length=500, description="Direct garment imagery URL")
    purchase_date: Optional[datetime] = Field(None, description="Date of acquisition")


class WardrobeItemCreate(WardrobeItemBase):
    """Payload for manual garment creation."""
    pass


class WardrobeItemUpdate(BaseModel):
    """Payload for updating an existing wardrobe item."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    subcategory: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, min_length=1, max_length=100)
    secondary_color: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)
    material: Optional[str] = Field(None, max_length=255)
    season: Optional[str] = Field(None, max_length=50)
    occasion: Optional[str] = Field(None, max_length=50)
    image_url: Optional[str] = Field(None, max_length=500)
    purchase_date: Optional[datetime] = None


class WardrobeItemResponse(BaseModel):
    """Complete wardrobe item entity representation."""
    id: str
    user_id: str
    product_id: Optional[str] = None
    order_item_id: Optional[str] = None
    source: str  # "purchased" | "manual"
    name: str
    brand: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    description: Optional[str] = None
    color: str
    secondary_color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    season: Optional[str] = None
    occasion: Optional[str] = None
    image_url: Optional[str] = None
    purchase_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WardrobeItemListResponse(BaseModel):
    """Paginated collection of customer wardrobe items."""
    items: List[WardrobeItemResponse]
    total: int
    page: int
    limit: int


class OutfitItemResponse(BaseModel):
    """Junction representation linking an outfit to a wardrobe garment."""
    id: str
    outfit_id: str
    wardrobe_item_id: str
    display_order: int
    created_at: datetime
    wardrobe_item: Optional[WardrobeItemResponse] = None

    model_config = ConfigDict(from_attributes=True)


class OutfitCreate(BaseModel):
    """Payload to create a new curated outfit ensemble."""
    name: str = Field(..., min_length=1, max_length=255, description="Outfit ensemble title")
    description: Optional[str] = Field(None, description="Stylist notes or occasion context")
    occasion: Optional[str] = Field(None, max_length=50, description="Occasion classification")
    season: Optional[str] = Field(None, max_length=50, description="Seasonal classification")
    cover_image_url: Optional[str] = Field(None, max_length=500, description="Optional featured ensemble visual")
    item_ids: Optional[List[str]] = Field(default_factory=list, description="Initial list of wardrobe item UUIDs")


class OutfitUpdate(BaseModel):
    """Payload to update outfit metadata."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    occasion: Optional[str] = Field(None, max_length=50)
    season: Optional[str] = Field(None, max_length=50)
    cover_image_url: Optional[str] = Field(None, max_length=500)


class OutfitItemAddRequest(BaseModel):
    """Payload to append a single wardrobe garment to an outfit."""
    wardrobe_item_id: str = Field(..., description="UUID of the customer-owned wardrobe item")
    display_order: Optional[int] = Field(0, description="Ordering priority in outfit breakdown")


class OutfitItemsReorderRequest(BaseModel):
    """Payload to update the sequenced display order of wardrobe items in an outfit."""
    item_ids: List[str] = Field(..., description="Ordered list of wardrobe item UUIDs")


class OutfitResponse(BaseModel):
    """Full outfit representation with sequenced garments."""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    occasion: Optional[str] = None
    season: Optional[str] = None
    cover_image_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[OutfitItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class OutfitListResponse(BaseModel):
    """Collection of saved outfits for the customer."""
    outfits: List[OutfitResponse]
    total: int


class ImportPurchasesResponse(BaseModel):
    """Result of bulk importing eligible order items into customer wardrobe."""
    created_count: int
    skipped_count: int
    items: List[WardrobeItemResponse]


class WardrobeStatsResponse(BaseModel):
    """Statistical summary of customer's digital wardrobe."""
    total_items: int
    total_outfits: int
    by_category: dict[str, int]
    by_color: dict[str, int]
    by_occasion: dict[str, int]
    by_season: dict[str, int]
    recent_additions: List[WardrobeItemResponse]
    try_on_ready_count: int


class StylistPreferencesSchema(BaseModel):
    """Customer styling preferences for the DRAPE Stylist."""
    style_direction: str = Field("contemporary_minimal", max_length=64)
    favorite_occasions: List[str] = Field(default_factory=lambda: ["casual", "office"])
    favorite_colors: List[str] = Field(default_factory=lambda: ["black", "white", "navy", "beige"])
    excluded_colors: List[str] = Field(default_factory=list)
    preferred_season: Optional[str] = Field("all-season", max_length=50)
    rotation_strategy: str = Field("balanced", max_length=32, description="'balanced', 'avoid_recent', or 'max_variety'")
    inferred_favorites: dict = Field(default_factory=dict, description="Behaviorally learned preferences")


class StylistPreferencesResponse(StylistPreferencesSchema):
    """Preferences with persistence timestamps."""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutfitRecommendationItem(BaseModel):
    """Individual garment within a generated outfit recommendation."""
    role: str  # top, bottom, dress, outerwear, accessory
    wardrobe_item: WardrobeItemResponse


class OutfitRecommendationResponse(BaseModel):
    """A generated, scored outfit recommendation with editorial rationale."""
    id: str
    title: str
    occasion: str
    season: str
    score: float
    score_breakdown: dict[str, float]
    stylist_notes: str
    reasons: List[str] = Field(default_factory=list, description="Explicit explainability tags")
    items: List[OutfitRecommendationItem]
    is_saved: bool = False
    recommendation_hash: str


class OutfitRecommendationListResponse(BaseModel):
    """Collection of generated outfit recommendations."""
    occasion: Optional[str] = None
    total_generated: int
    recommendations: List[OutfitRecommendationResponse]


class OutfitFeedbackRequest(BaseModel):
    """Customer interaction with an outfit recommendation."""
    outfit_id: Optional[str] = None
    recommendation_hash: Optional[str] = None
    action: str = Field(..., description="'like', 'dislike', 'save', 'skip', or 'worn'")
    notes: Optional[str] = None


class OutfitFeedbackResponse(BaseModel):
    """Response confirming feedback recording."""
    success: bool
    action: str
    message: str
    saved_outfit_id: Optional[str] = None


class ComplementaryProductResponse(BaseModel):
    """Product suggestion to complete the customer's look based on wardrobe gap analysis."""
    id: str
    name: str
    category: str
    price: float
    image_url: Optional[str] = None
    color: str
    colors: List[str]
    reason: str
    compatible_try_on: bool
    product_slug: str


class CompleteLookResponse(BaseModel):
    """Gap analysis and catalog recommendations to complete customer's wardrobe."""
    missing_categories: List[str]
    owned_categories: List[str]
    total_owned: int
    suggestions: List[ComplementaryProductResponse]


# ==============================================================================
# WEAR LOGS & ROTATION SCHEMAS
# ==============================================================================


class WearLogItemSchema(BaseModel):
    """Preserved snapshot of an individual garment worn."""
    id: str
    wear_log_id: str
    wardrobe_item_id: Optional[str] = None
    product_id: Optional[str] = None
    garment_name_snapshot: str
    category_snapshot: str
    color_snapshot: str
    image_url_snapshot: Optional[str] = None
    display_order: int

    model_config = ConfigDict(from_attributes=True)


class WearLogCreateItem(BaseModel):
    """Item specification for custom wear log item."""
    wardrobe_item_id: Optional[str] = None
    product_id: Optional[str] = None
    garment_name: str
    category: str
    color: str
    image_url: Optional[str] = None
    display_order: int = 0


class WearLogCreate(BaseModel):
    """Payload to log a worn outfit for a specific date."""
    wear_date: Optional[str] = Field(None, description="ISO Date string YYYY-MM-DD. Defaults to today.")
    outfit_id: Optional[str] = Field(None, description="Optional link to a saved Outfit UUID")
    occasion: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    items: Optional[List[WearLogCreateItem]] = None
    wardrobe_item_ids: Optional[List[str]] = Field(None, description="UUIDs of wardrobe items worn; snapshots derived automatically")


class WearLogResponse(BaseModel):
    """Recorded wear diary entry with immutable snapshots."""
    id: str
    user_id: str
    wear_date: str
    outfit_id: Optional[str] = None
    occasion: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    items: List[WearLogItemSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class WearLogListResponse(BaseModel):
    """Collection of wear logs for calendar and diary views."""
    wear_logs: List[WearLogResponse]
    total: int


class GarmentRotationItem(BaseModel):
    """Garment usage and rotation health metrics."""
    wardrobe_item_id: str
    name: str
    category: str
    color: str
    image_url: Optional[str] = None
    total_wears: int
    last_worn_date: Optional[str] = None
    wears_last_7_days: int
    wears_last_30_days: int
    rotation_status: str  # "frequent", "balanced", "underutilized", "unworn"


class WardrobeRotationResponse(BaseModel):
    """Comprehensive wardrobe rotation metrics."""
    total_logged_wears: int
    rotation_strategy: str
    most_worn: List[GarmentRotationItem]
    least_worn: List[GarmentRotationItem]
    all_garments: List[GarmentRotationItem] = Field(default_factory=list)
    recent_activity: List[WearLogResponse] = Field(default_factory=list)


# ==============================================================================
# OUTFIT PLANNER SCHEMAS
# ==============================================================================


class OutfitPlanItem(BaseModel):
    """Garment item within a planned outfit."""
    wardrobe_item_id: Optional[str] = None
    product_id: Optional[str] = None
    name: str
    category: str
    color: str
    image_url: Optional[str] = None


class OutfitPlanCreate(BaseModel):
    """Payload to schedule an outfit on the calendar."""
    plan_date: str = Field(..., description="Target date in YYYY-MM-DD format")
    outfit_id: Optional[str] = None
    occasion: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[OutfitPlanItem]] = None
    wardrobe_item_ids: Optional[List[str]] = Field(None, description="Wardrobe item IDs to plan")


class OutfitPlanUpdate(BaseModel):
    """Payload to update an outfit plan."""
    plan_date: Optional[str] = None
    occasion: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # "planned", "worn", "cancelled"
    items: Optional[List[OutfitPlanItem]] = None


class OutfitPlanResponse(BaseModel):
    """Scheduled outfit plan."""
    id: str
    user_id: str
    plan_date: str
    outfit_id: Optional[str] = None
    occasion: Optional[str] = None
    notes: Optional[str] = None
    status: str
    items: List[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OutfitPlanListResponse(BaseModel):
    """List of upcoming and past scheduled outfit plans."""
    plans: List[OutfitPlanResponse]
    total: int


# ==============================================================================
# PERSONAL STYLE PROFILE & DAILY STYLIST SCHEMAS
# ==============================================================================


class StyleProfileInsight(BaseModel):
    """Editorial observation derived from customer's wardrobe and wear habits."""
    title: str
    description: str
    category: str  # "palette", "silhouette", "rotation", "lifestyle"


class StyleProfileResponse(BaseModel):
    """Evolving personal style profile combining explicit preferences with behavioral data."""
    style_direction: str
    rotation_strategy: str
    favorite_occasions: List[str]
    favorite_colors: List[str]
    color_distribution: dict[str, int]
    category_distribution: dict[str, int]
    total_wears: int
    total_saved_outfits: int
    total_wardrobe_items: int
    insights: List[StyleProfileInsight]


class DailyStylistResponse(BaseModel):
    """Daily personalized stylist greeting, recommendation, and context."""
    greeting: str
    date_display: str
    occasion_context: str
    weather_summary: str
    todays_pick: Optional[OutfitRecommendationResponse] = None
    alternative_picks: List[OutfitRecommendationResponse] = Field(default_factory=list)
    recent_wear_alert: Optional[str] = None
    stylist_tip: str



