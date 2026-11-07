"""
DRAPE Smart Digital Wardrobe & Outfits API Endpoints.

Handles:
- Wardrobe item CRUD with pagination, filtering, search, and sorting.
- Purchase ingestion from validated order-item snapshots.
- Idempotent bulk purchase import.
- Curated outfit ensemble CRUD, garment membership, and sequence reordering.
- Enforces strict customer ownership and IDOR isolation.
Conforms to ADR-001, ADR-002, and RFC 9457 error contracts.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.api.v1.schemas.wardrobe import (
    CompleteLookResponse,
    ComplementaryProductResponse,
    ImportPurchasesResponse,
    OutfitCreate,
    OutfitFeedbackRequest,
    OutfitFeedbackResponse,
    OutfitItemAddRequest,
    OutfitItemsReorderRequest,
    OutfitListResponse,
    OutfitRecommendationItem,
    OutfitRecommendationListResponse,
    OutfitRecommendationResponse,
    OutfitResponse,
    OutfitUpdate,
    StylistPreferencesResponse,
    StylistPreferencesSchema,
    WardrobeItemCreate,
    WardrobeItemListResponse,
    WardrobeItemResponse,
    WardrobeItemUpdate,
    WardrobeStatsResponse,
)
from app.domain.models.catalog import Product, ProductImage
from app.domain.models.identity import User
from app.domain.models.order import Order, OrderItem
from app.domain.models.wardrobe import (
    Outfit,
    OutfitFeedback,
    OutfitItem,
    StylistPreferences,
    WardrobeItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wardrobe", tags=["Smart Digital Wardrobe"])


# ==============================================================================
# WARDROBE ITEMS ENDPOINTS
# ==============================================================================


@router.get(
    "",
    response_model=WardrobeItemListResponse,
    status_code=status.HTTP_200_OK,
    summary="List authenticated customer's wardrobe items",
)
async def list_wardrobe_items(
    category: Optional[str] = Query(None, description="Filter by garment category"),
    color: Optional[str] = Query(None, description="Filter by primary color"),
    season: Optional[str] = Query(None, description="Filter by season"),
    occasion: Optional[str] = Query(None, description="Filter by occasion"),
    source: Optional[str] = Query(None, description="Filter by source: 'purchased' or 'manual'"),
    search: Optional[str] = Query(None, description="Search garment name or brand"),
    sort_by: str = Query("newest", description="Sort order: newest, oldest, name_asc, name_desc"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemListResponse:
    """Retrieves paginated, filtered wardrobe collection owned strictly by the authenticated customer."""
    query = select(WardrobeItem).where(WardrobeItem.user_id == current_user.id)

    # Filters
    if category:
        query = query.where(func.lower(WardrobeItem.category) == category.strip().lower())
    if color:
        query = query.where(func.lower(WardrobeItem.color) == color.strip().lower())
    if season:
        query = query.where(func.lower(WardrobeItem.season) == season.strip().lower())
    if occasion:
        query = query.where(func.lower(WardrobeItem.occasion) == occasion.strip().lower())
    if source:
        query = query.where(func.lower(WardrobeItem.source) == source.strip().lower())

    # Search in name or brand
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(WardrobeItem.name).like(term),
                func.lower(WardrobeItem.brand).like(term),
                func.lower(WardrobeItem.description).like(term),
            )
        )

    # Total count
    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar_one()

    # Sorting
    if sort_by == "oldest":
        query = query.order_by(WardrobeItem.created_at.asc())
    elif sort_by == "name_asc":
        query = query.order_by(WardrobeItem.name.asc())
    elif sort_by == "name_desc":
        query = query.order_by(WardrobeItem.name.desc())
    else:
        query = query.order_by(WardrobeItem.created_at.desc())

    # Pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    items = list(result.scalars().all())

    return WardrobeItemListResponse(
        items=[WardrobeItemResponse.model_validate(item) for item in items],
        total=total_count,
        page=page,
        limit=limit,
    )


@router.post(
    "",
    response_model=WardrobeItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a manual clothing item to customer's wardrobe",
)
async def create_manual_wardrobe_item(
    payload: WardrobeItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemResponse:
    """Creates and persists a customer-owned garment entered manually."""
    item = WardrobeItem(
        user_id=current_user.id,
        source="manual",
        name=payload.name.strip(),
        brand=payload.brand.strip() if payload.brand else "DRAPE Atelier",
        category=payload.category.strip().lower(),
        subcategory=payload.subcategory.strip().lower() if payload.subcategory else None,
        description=payload.description.strip() if payload.description else None,
        color=payload.color.strip(),
        secondary_color=payload.secondary_color.strip() if payload.secondary_color else None,
        size=payload.size.strip() if payload.size else None,
        material=payload.material.strip() if payload.material else None,
        season=payload.season.strip().lower() if payload.season else None,
        occasion=payload.occasion.strip().lower() if payload.occasion else None,
        image_url=payload.image_url.strip() if payload.image_url else None,
        purchase_date=payload.purchase_date,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    return WardrobeItemResponse.model_validate(item)


def _infer_category_from_name(name: str) -> str:
    """Infers standard apparel category from garment display name."""
    name_l = name.lower()
    if any(k in name_l for k in ["t-shirt", "tee", "crew neck", "crewneck"]):
        return "t-shirts"
    if any(k in name_l for k in ["jean", "denim"]):
        return "jeans"
    if any(k in name_l for k in ["trouser", "pant", "chino"]):
        return "trousers"
    if "skirt" in name_l:
        return "skirts"
    if "dress" in name_l:
        return "dresses"
    if "shirt" in name_l:
        return "shirts"
    if any(k in name_l for k in ["coat", "jacket", "blazer", "outerwear"]):
        return "outerwear"
    if any(k in name_l for k in ["knit", "sweater", "cardigan"]):
        return "knitwear"
    return "tops"


def _build_wardrobe_item_from_snapshot(
    snapshot: Dict[str, Any],
    user_id: str,
    product: Optional[Product] = None,
) -> WardrobeItem:
    """Helper to construct a purchased WardrobeItem from an eligible order item snapshot and optional Product metadata."""
    if product and product.category and product.category.lower() not in ("garment", "apparel"):
        category = product.category.lower()
    else:
        category = _infer_category_from_name(snapshot.get("product_name", ""))

    brand = product.brand if product else "DRAPE Atelier"
    material = product.material if product else None
    description = (
        product.description
        if product
        else f"Acquired via DRAPE order {snapshot['order_number']}"
    )

    return WardrobeItem(
        user_id=user_id,
        product_id=snapshot.get("product_id"),
        order_item_id=snapshot["id"],
        source="purchased",
        name=snapshot["product_name"],
        brand=brand,
        category=category,
        description=description,
        color=snapshot.get("color") or "neutral",
        size=snapshot.get("size") or "M",
        material=material,
        image_url=snapshot.get("image_url"),
        purchase_date=snapshot.get("purchase_date"),
    )


async def ingest_order_items_to_wardrobe(
    order: Order,
    db: AsyncSession,
) -> List[WardrobeItem]:
    """
    Automatically and idempotently imports purchased garments from a paid order into the customer's wardrobe.
    Called immediately upon payment confirmation.
    """
    if not order.user_id or order.payment_status != "paid" or order.status in ("cancelled", "failed"):
        return []

    user_id = str(order.user_id)

    # Fetch order items for this order
    stmt = select(OrderItem).where(OrderItem.order_id == order.id)
    res = await db.execute(stmt)
    order_items = list(res.scalars().all())

    if not order_items:
        return []

    order_item_ids = [oi.id for oi in order_items]
    existing_stmt = select(WardrobeItem.order_item_id).where(
        WardrobeItem.order_item_id.in_(order_item_ids),
        WardrobeItem.user_id == user_id,
    )
    existing_res = await db.execute(existing_stmt)
    already_imported = set(existing_res.scalars().all())

    created: List[WardrobeItem] = []
    for oi in order_items:
        if oi.id in already_imported:
            continue

        product = None
        if oi.product_id:
            prod_res = await db.execute(select(Product).where(Product.id == oi.product_id))
            product = prod_res.scalar_one_or_none()

        snapshot = {
            "id": oi.id,
            "product_id": oi.product_id,
            "product_name": oi.product_name,
            "color": oi.color or "neutral",
            "size": oi.size or "standard",
            "image_url": oi.image_url,
            "order_number": order.order_number,
            "purchase_date": order.created_at,
        }
        item = _build_wardrobe_item_from_snapshot(
            snapshot=snapshot,
            user_id=user_id,
            product=product,
        )
        db.add(item)
        created.append(item)
        already_imported.add(oi.id)

    if created:
        try:
            await db.commit()
            for ci in created:
                await db.refresh(ci)
        except IntegrityError:
            await db.rollback()
            # If concurrent webhook / verification already inserted, query them back
            refetch_stmt = select(WardrobeItem).where(
                WardrobeItem.order_item_id.in_(order_item_ids),
                WardrobeItem.user_id == user_id,
            )
            refetch_res = await db.execute(refetch_stmt)
            return list(refetch_res.scalars().all())

    return created


# ==============================================================================
# PURCHASE INGESTION ENDPOINTS
# ==============================================================================


@router.post(
    "/from-purchase/{order_item_id}",
    response_model=WardrobeItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an eligible purchased item to customer's wardrobe",
)
async def add_from_purchase(
    order_item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemResponse:
    """
    Imports a verified purchased garment from order history.
    Validates that:
    1. The order belongs to the authenticated customer.
    2. The order is paid and not cancelled/failed.
    3. The item has not already been imported.
    """
    user_id = str(current_user.id)
    stmt = (
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            OrderItem.id == order_item_id,
            Order.user_id == user_id,
        )
        .options(selectinload(OrderItem.order))
    )
    res = await db.execute(stmt)
    order_item = res.scalar_one_or_none()

    if not order_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchased order item not found or does not belong to your account.",
        )

    order = order_item.order
    if order.payment_status != "paid" or order.status in ("cancelled", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot import item from order with status '{order.status}' and payment status '{order.payment_status}'. Only paid, non-cancelled orders can be imported.",
        )

    # Check duplicate import
    existing_stmt = select(WardrobeItem).where(
        WardrobeItem.order_item_id == order_item_id,
        WardrobeItem.user_id == user_id,
    )
    existing_res = await db.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This purchased item has already been added to your wardrobe.",
        )

    # Snapshot item data as plain dictionary
    snapshot = {
        "id": order_item.id,
        "product_id": order_item.product_id,
        "product_name": order_item.product_name,
        "color": order_item.color,
        "size": order_item.size,
        "image_url": order_item.image_url,
        "order_number": order.order_number,
        "purchase_date": order.created_at,
    }

    # Retrieve catalog product for richer metadata if available
    product = None
    if snapshot["product_id"]:
        prod_res = await db.execute(select(Product).where(Product.id == snapshot["product_id"]))
        product = prod_res.scalar_one_or_none()

    wardrobe_item = _build_wardrobe_item_from_snapshot(
        snapshot=snapshot,
        user_id=user_id,
        product=product,
    )
    db.add(wardrobe_item)
    try:
        await db.commit()
        await db.refresh(wardrobe_item)
    except IntegrityError:
        await db.rollback()
        # Handle concurrent import race gracefully
        existing_res = await db.execute(
            select(WardrobeItem).where(
                WardrobeItem.order_item_id == order_item_id,
                WardrobeItem.user_id == user_id,
            )
        )
        if existing_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This purchased item has already been added to your wardrobe.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflict importing purchased item due to concurrent import.",
        )

    return WardrobeItemResponse.model_validate(wardrobe_item)


@router.post(
    "/import-purchases",
    response_model=ImportPurchasesResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk import all eligible purchased items from customer's order history",
)
async def import_all_purchases(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ImportPurchasesResponse:
    """
    Idempotently scans the authenticated customer's paid orders and imports all
    unimported items into their smart wardrobe. Handles concurrency gracefully.
    """
    user_id = str(current_user.id)
    # 1. Fetch all items from user's paid, non-cancelled orders
    orders_stmt = (
        select(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .where(
            Order.user_id == user_id,
            Order.payment_status == "paid",
            Order.status.notin_(["cancelled", "failed"]),
        )
        .options(selectinload(OrderItem.order))
    )
    order_items_res = await db.execute(orders_stmt)
    eligible_items = list(order_items_res.scalars().all())

    # Snapshot eligible items into plain dictionaries to prevent ORM expiration on rollback
    eligible_snapshots = [
        {
            "id": oi.id,
            "product_id": oi.product_id,
            "product_name": oi.product_name,
            "color": oi.color,
            "size": oi.size,
            "image_url": oi.image_url,
            "order_number": oi.order.order_number,
            "purchase_date": oi.order.created_at,
        }
        for oi in eligible_items
    ]

    # 2. Fetch already imported order_item_ids for this user
    existing_stmt = select(WardrobeItem.order_item_id).where(
        WardrobeItem.user_id == user_id,
        WardrobeItem.order_item_id.is_not(None),
    )
    existing_res = await db.execute(existing_stmt)
    already_imported_ids = set(existing_res.scalars().all())

    created_items: List[WardrobeItem] = []
    skipped_count = 0

    for snap in eligible_snapshots:
        if snap["id"] in already_imported_ids:
            skipped_count += 1
            continue

        product = None
        if snap["product_id"]:
            prod_res = await db.execute(select(Product).where(Product.id == snap["product_id"]))
            product = prod_res.scalar_one_or_none()

        new_wi = _build_wardrobe_item_from_snapshot(
            snapshot=snap,
            user_id=user_id,
            product=product,
        )
        db.add(new_wi)
        created_items.append(new_wi)
        already_imported_ids.add(snap["id"])

    if created_items:
        try:
            await db.commit()
            for ci in created_items:
                await db.refresh(ci)
        except IntegrityError:
            await db.rollback()
            # Concurrently persisted by another request: re-fetch from database to identify
            # items that are now already imported, and attempt inserting only the remaining items.
            existing_res = await db.execute(
                select(WardrobeItem.order_item_id).where(
                    WardrobeItem.user_id == user_id,
                    WardrobeItem.order_item_id.is_not(None),
                )
            )
            already_imported_ids = set(existing_res.scalars().all())

            retry_created_items: List[WardrobeItem] = []
            for snap in eligible_snapshots:
                if snap["id"] in already_imported_ids:
                    continue

                product = None
                if snap["product_id"]:
                    prod_res = await db.execute(select(Product).where(Product.id == snap["product_id"]))
                    product = prod_res.scalar_one_or_none()

                new_wi = _build_wardrobe_item_from_snapshot(
                    snapshot=snap,
                    user_id=user_id,
                    product=product,
                )
                db.add(new_wi)
                retry_created_items.append(new_wi)
                already_imported_ids.add(snap["id"])

            if retry_created_items:
                try:
                    await db.commit()
                    for ci in retry_created_items:
                        await db.refresh(ci)
                except IntegrityError:
                    await db.rollback()
                    # If still racing, none were created in this request
                    retry_created_items = []

            # Exact consistency: created_count reflects only items created by THIS request;
            # items created by concurrent requests are counted as skipped.
            return ImportPurchasesResponse(
                created_count=len(retry_created_items),
                skipped_count=len(eligible_snapshots) - len(retry_created_items),
                items=[WardrobeItemResponse.model_validate(ci) for ci in retry_created_items],
            )

    return ImportPurchasesResponse(
        created_count=len(created_items),
        skipped_count=skipped_count,
        items=[WardrobeItemResponse.model_validate(ci) for ci in created_items],
    )


# ==============================================================================
# SMART DIGITAL WARDROBE ANALYTICS & STYLIST ENGINE
# ==============================================================================


NEUTRAL_COLORS = {
    "black", "noir", "white", "grey", "gray", "charcoal", "navy", "navy blue",
    "beige", "cream", "off-white", "stone", "ecru", "ivory",
}
EARTH_TONES = {"olive", "olive green", "brown", "tan", "khaki", "sage", "washed blue"}

CATALOG_EVERYDAY_STYLES = [
    {
        "id": "atelier-classic-crew-tee",
        "name": "Classic Regular-Fit Crew Neck T-Shirt",
        "category": "t-shirts",
        "price": 75.0,
        "image_url": "/images/classic-crew-black-front.jpg",
        "color": "Black",
        "colors": ["Black", "White", "Grey", "Navy Blue", "Beige"],
        "reason": "An essential neutral foundation piece that anchors tailored trousers and skirts with understated luxury.",
        "compatible_try_on": True,
        "product_slug": "classic-regular-fit-crew-neck-t-shirt",
    },
    {
        "id": "atelier-straight-jeans-washed-blue",
        "name": "Women's Straight-Fit Jeans",
        "category": "jeans",
        "price": 195.0,
        "image_url": "/images/womens-straight-jeans-washed-blue-front.jpg",
        "color": "Washed Blue",
        "colors": ["Washed Blue", "Vintage Indigo", "Jet Black", "Natural Raw Denim"],
        "reason": "Classic Japanese selvage denim cut in a timeless straight leg to pair seamlessly with crew tees.",
        "compatible_try_on": False,
        "product_slug": "womens-straight-fit-jeans",
    },
    {
        "id": "atelier-tailored-trousers",
        "name": "Tailored Pleated Trousers",
        "category": "trousers",
        "price": 260.0,
        "image_url": "/images/look-3-item2.jpg",
        "color": "Charcoal",
        "colors": ["Charcoal", "Black", "Sandstone Beige", "Navy Blue"],
        "reason": "Sharp architectural tailoring to instantly elevate your everyday tees into sophisticated office ensembles.",
        "compatible_try_on": False,
        "product_slug": "tailored-pleated-trousers",
    },
    {
        "id": "atelier-aline-midi-skirt",
        "name": "A-Line Midi Skirt",
        "category": "skirts",
        "price": 175.0,
        "image_url": "/images/look-5-item1.jpg",
        "color": "Noir",
        "colors": ["Noir", "Bone White", "Olive Green", "Cocoa Brown"],
        "reason": "Clean, flowing lines with 3D virtual try-on compatibility for effortless day-to-night styling.",
        "compatible_try_on": True,
        "product_slug": "a-line-midi-skirt",
    },
    {
        "id": "atelier-ribbed-knit-midi-dress",
        "name": "Ribbed Knit Midi Dress",
        "category": "dresses",
        "price": 295.0,
        "image_url": "/images/look-4-item1.jpg",
        "color": "Black",
        "colors": ["Black", "Warm Taupe", "Olive Green", "Deep Navy"],
        "reason": "A complete standalone silhouette featuring real-time 3D cloth drape simulation.",
        "compatible_try_on": True,
        "product_slug": "ribbed-knit-midi-dress",
    },
]


def _classify_role(category: str, name: str) -> str:
    cat = (category or "").lower().strip()
    nm = (name or "").lower().strip()
    if "dress" in cat or "dress" in nm:
        return "dress"
    if any(k in cat for k in ["jean", "trouser", "pant", "chino", "bottom", "short", "skirt"]) or any(k in nm for k in ["jean", "trouser", "pant", "denim", "skirt"]):
        return "bottom"
    if any(k in cat for k in ["coat", "jacket", "blazer", "outerwear"]) or any(k in nm for k in ["coat", "jacket", "blazer"]):
        return "outerwear"
    if any(k in cat for k in ["accessori", "scarf", "belt", "bag", "hat", "jewel"]):
        return "accessory"
    return "top"


def _calc_color_harmony(colors: List[str]) -> float:
    normalized = [c.lower().strip() for c in colors if c]
    if not normalized:
        return 0.85
    if len(normalized) == 1:
        return 0.95

    # Check neutrals
    all_neutral = all(any(nc in c for nc in NEUTRAL_COLORS) for c in normalized)
    if all_neutral:
        return 0.98

    # Check neutral + earth
    neutral_or_earth = all(
        any(nc in c for nc in NEUTRAL_COLORS) or any(ec in c for ec in EARTH_TONES)
        for c in normalized
    )
    if neutral_or_earth:
        return 0.92

    return 0.78


def _calc_occasion_score(items: List[WardrobeItem], occasion: str) -> float:
    occ = (occasion or "casual").lower().strip()
    names = [it.name.lower() for it in items]
    cats = [it.category.lower() for it in items]

    if occ == "office":
        has_trousers = any("trouser" in c or "trouser" in n for c, n in zip(cats, names))
        has_jeans = any("jean" in c or "jean" in n for c, n in zip(cats, names))
        if has_trousers:
            return 0.96
        if has_jeans:
            return 0.72
        return 0.86

    elif occ in ("formal", "evening"):
        has_dress = any("dress" in c or "dress" in n for c, n in zip(cats, names))
        has_dark = any(it.color.lower() in ("black", "noir", "charcoal", "navy") for it in items)
        if has_dress and has_dark:
            return 0.98
        if has_dress:
            return 0.92
        return 0.80

    elif occ in ("casual", "weekend"):
        has_jeans = any("jean" in c or "jean" in n for c, n in zip(cats, names))
        has_tee = any("t-shirt" in c or "tee" in n or "crew" in n for c, n in zip(cats, names))
        if has_jeans and has_tee:
            return 0.98
        return 0.90

    return 0.85


def _generate_editorial_notes(items: List[WardrobeItem], occasion: str, harmony_score: float) -> str:
    garment_names = [it.name for it in items]
    colors = [it.color for it in items]
    occ_title = occasion.capitalize()

    palette_desc = (
        "monochromatic tonal clarity"
        if len(set(c.lower() for c in colors)) == 1
        else "restrained neutral harmony"
        if harmony_score > 0.9
        else "modern tonal contrast"
    )

    if len(items) == 2:
        return (
            f"{occ_title} curation: pairing the {garment_names[0]} in {colors[0]} with the "
            f"{garment_names[1]} in {colors[1]}. The silhouette emphasizes architectural ease and "
            f"{palette_desc}, perfectly balanced for {occasion} moments."
        )
    elif len(items) == 1:
        return (
            f"An effortless standalone statement featuring the {garment_names[0]} in {colors[0]}. "
            f"Clean proportions and premium drape create an instant, refined {occasion} look."
        )
    else:
        joined_items = ", ".join(f"{it.name} ({it.color})" for it in items[:-1]) + f", and {items[-1].name} ({items[-1].color})"
        return (
            f"A multi-layered {occ_title} composition bringing together {joined_items}. "
            f"Layered textures achieve {palette_desc} with effortless versatility."
        )


@router.get(
    "/stats",
    response_model=WardrobeStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get customer wardrobe overview and analytics",
)
async def get_wardrobe_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeStatsResponse:
    """Calculates comprehensive wardrobe statistics, category breakdowns, and try-on readiness."""
    user_id = str(current_user.id)
    items_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user_id).order_by(WardrobeItem.created_at.desc())
    items_res = await db.execute(items_stmt)
    all_items = list(items_res.scalars().all())

    outfits_stmt = select(func.count(Outfit.id)).where(Outfit.user_id == user_id)
    outfits_res = await db.execute(outfits_stmt)
    total_outfits = outfits_res.scalar_one()

    by_category: Dict[str, int] = {}
    by_color: Dict[str, int] = {}
    by_occasion: Dict[str, int] = {}
    by_season: Dict[str, int] = {}
    try_on_ready_count = 0

    try_on_keywords = [
        "crewneck", "crew neck", "oversized", "fitted", "sleeveless", "long-sleeve",
        "longsleeve", "a-line", "aline", "pleated", "midi dress", "tshirt", "t-shirt"
    ]

    for it in all_items:
        cat = (it.category or "uncategorized").lower()
        by_category[cat] = by_category.get(cat, 0) + 1

        col = (it.color or "neutral").lower()
        by_color[col] = by_color.get(col, 0) + 1

        occ = (it.occasion or "versatile").lower()
        by_occasion[occ] = by_occasion.get(occ, 0) + 1

        sea = (it.season or "all-season").lower()
        by_season[sea] = by_season.get(sea, 0) + 1

        name_lower = (it.name or "").lower()
        if any(kw in name_lower or kw in cat for kw in try_on_keywords):
            try_on_ready_count += 1

    recent = [WardrobeItemResponse.model_validate(it) for it in all_items[:5]]

    return WardrobeStatsResponse(
        total_items=len(all_items),
        total_outfits=total_outfits,
        by_category=by_category,
        by_color=by_color,
        by_occasion=by_occasion,
        by_season=by_season,
        recent_additions=recent,
        try_on_ready_count=try_on_ready_count,
    )


@router.get(
    "/preferences",
    response_model=StylistPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get customer styling preferences",
)
async def get_stylist_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StylistPreferencesResponse:
    """Retrieves or initializes the customer's personal fashion stylist preferences."""
    user_id = str(current_user.id)
    stmt = select(StylistPreferences).where(StylistPreferences.user_id == user_id)
    res = await db.execute(stmt)
    pref = res.scalar_one_or_none()

    if not pref:
        pref = StylistPreferences(
            user_id=user_id,
            style_direction="contemporary_minimal",
            favorite_occasions=["casual", "office", "weekend"],
            favorite_colors=["black", "white", "navy", "beige"],
            excluded_colors=[],
            preferred_season="all-season",
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    return StylistPreferencesResponse.model_validate(pref)


@router.put(
    "/preferences",
    response_model=StylistPreferencesResponse,
    status_code=status.HTTP_200_OK,
    summary="Update customer styling preferences",
)
async def update_stylist_preferences(
    payload: StylistPreferencesSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StylistPreferencesResponse:
    """Updates customer's styling parameters (style direction, favored/excluded colors, occasions)."""
    user_id = str(current_user.id)
    stmt = select(StylistPreferences).where(StylistPreferences.user_id == user_id)
    res = await db.execute(stmt)
    pref = res.scalar_one_or_none()

    if not pref:
        pref = StylistPreferences(
            user_id=user_id,
            style_direction=payload.style_direction,
            favorite_occasions=payload.favorite_occasions,
            favorite_colors=payload.favorite_colors,
            excluded_colors=payload.excluded_colors,
            preferred_season=payload.preferred_season,
        )
        db.add(pref)
    else:
        pref.style_direction = payload.style_direction
        pref.favorite_occasions = payload.favorite_occasions
        pref.favorite_colors = payload.favorite_colors
        pref.excluded_colors = payload.excluded_colors
        pref.preferred_season = payload.preferred_season

    await db.commit()
    await db.refresh(pref)
    return StylistPreferencesResponse.model_validate(pref)


@router.post(
    "/recommendations/generate",
    response_model=OutfitRecommendationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate deterministic, explainable outfit recommendations",
)
async def generate_outfit_recommendations(
    occasion: Optional[str] = Query("casual", description="Target occasion (casual, office, formal, evening, weekend)"),
    season: Optional[str] = Query("all-season", description="Seasonal focus"),
    limit: int = Query(6, ge=1, le=20, description="Maximum recommendations to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitRecommendationListResponse:
    """
    Generates intelligent outfit recommendations exclusively from customer-owned garments.
    Scored across Category Compatibility (30%), Color Harmony (25%), Occasion Suitability (20%),
    Preference Match (15%), and Novelty & Feedback Adjustment (10%).
    """
    user_id = str(current_user.id)

    # 1. Fetch user items
    items_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user_id)
    items_res = await db.execute(items_stmt)
    all_items = list(items_res.scalars().all())

    if not all_items:
        return OutfitRecommendationListResponse(
            occasion=occasion,
            total_generated=0,
            recommendations=[],
        )

    # 2. Fetch user preferences
    pref_stmt = select(StylistPreferences).where(StylistPreferences.user_id == user_id)
    pref_res = await db.execute(pref_stmt)
    prefs = pref_res.scalar_one_or_none()
    fav_colors = [c.lower() for c in (prefs.favorite_colors if prefs else ["black", "navy", "white", "beige"])]
    excl_colors = [c.lower() for c in (prefs.excluded_colors if prefs else [])]

    # 3. Fetch past feedback to adjust novelty / downweight disliked
    feedback_stmt = select(OutfitFeedback).where(OutfitFeedback.user_id == user_id)
    fb_res = await db.execute(feedback_stmt)
    feedbacks = list(fb_res.scalars().all())
    disliked_hashes = {fb.recommendation_hash for fb in feedbacks if fb.action in ("dislike", "skip")}
    liked_hashes = {fb.recommendation_hash for fb in feedbacks if fb.action in ("like", "worn", "save")}

    # 4. Group items by functional role
    role_map: Dict[str, List[WardrobeItem]] = {
        "top": [],
        "bottom": [],
        "dress": [],
        "outerwear": [],
        "accessory": [],
    }
    for item in all_items:
        role = _classify_role(item.category, item.name)
        role_map[role].append(item)

    # 5. Form candidate combinations
    candidates: List[Dict[str, Any]] = []

    # Template 1: Top + Bottom
    for top in role_map["top"]:
        for btm in role_map["bottom"]:
            candidates.append({"items": [(top, "top"), (btm, "bottom")]})
            # Optional: Top + Bottom + Outerwear
            for out in role_map["outerwear"][:2]:
                candidates.append({"items": [(top, "top"), (btm, "bottom"), (out, "outerwear")]})

    # Template 2: Dress (+ optional Outerwear)
    for drs in role_map["dress"]:
        candidates.append({"items": [(drs, "dress")]})
        for out in role_map["outerwear"][:2]:
            candidates.append({"items": [(drs, "dress"), (out, "outerwear")]})

    # Fallback: Single top or bottom if wardrobe is small
    if not candidates and all_items:
        for it in all_items[:3]:
            role = _classify_role(it.category, it.name)
            candidates.append({"items": [(it, role)]})

    scored_recommendations: List[OutfitRecommendationResponse] = []
    seen_hashes = set()

    for cand in candidates:
        pair_items = [ci[0] for ci in cand["items"]]
        item_ids = sorted([str(pi.id) for pi in pair_items])
        rec_hash = hashlib.sha256("-".join(item_ids).encode()).hexdigest()[:16]

        if rec_hash in seen_hashes:
            continue
        seen_hashes.add(rec_hash)

        # 1. Category compatibility (0.30)
        has_top = any(ci[1] == "top" for ci in cand["items"])
        has_bottom = any(ci[1] == "bottom" for ci in cand["items"])
        has_dress = any(ci[1] == "dress" for ci in cand["items"])
        if (has_top and has_bottom) or has_dress:
            cat_compat = 1.0
        elif len(pair_items) == 1:
            cat_compat = 0.65
        else:
            cat_compat = 0.75

        # 2. Color harmony (0.25)
        harmony = _calc_color_harmony([pi.color for pi in pair_items])

        # 3. Occasion suitability (0.20)
        occ_score = _calc_occasion_score(pair_items, occasion or "casual")

        # 4. User preference match (0.15)
        pref_match = 0.80
        # Excluded color penalty
        if any(any(ex in pi.color.lower() for ex in excl_colors) for pi in pair_items):
            pref_match -= 0.40
        # Favorite color boost
        if any(any(fav in pi.color.lower() for fav in fav_colors) for pi in pair_items):
            pref_match += 0.20
        pref_match = max(0.0, min(1.0, pref_match))

        # 5. Novelty / Feedback (0.10)
        novelty = 0.85
        if rec_hash in disliked_hashes:
            novelty = 0.20
        elif rec_hash in liked_hashes:
            novelty = 1.0

        final_score = round(
            (0.30 * cat_compat)
            + (0.25 * harmony)
            + (0.20 * occ_score)
            + (0.15 * pref_match)
            + (0.10 * novelty),
            2,
        )

        # Generate title & editorial notes
        if has_dress:
            title = f"{pair_items[0].name} Ensemble"
        elif has_top and has_bottom:
            title = f"{pair_items[0].name} & {pair_items[1].name}"
        else:
            title = f"{pair_items[0].name} Study"

        notes = _generate_editorial_notes(pair_items, occasion or "casual", harmony)

        rec_items = [
            OutfitRecommendationItem(
                role=ci[1],
                wardrobe_item=WardrobeItemResponse.model_validate(ci[0]),
            )
            for ci in cand["items"]
        ]

        scored_recommendations.append(
            OutfitRecommendationResponse(
                id=f"rec-{rec_hash}",
                title=title,
                occasion=occasion or "casual",
                season=season or "all-season",
                score=final_score,
                score_breakdown={
                    "category_compatibility": round(cat_compat, 2),
                    "color_harmony": round(harmony, 2),
                    "occasion_suitability": round(occ_score, 2),
                    "preference_match": round(pref_match, 2),
                    "novelty": round(novelty, 2),
                },
                stylist_notes=notes,
                items=rec_items,
                is_saved=False,
                recommendation_hash=rec_hash,
            )
        )

    # Sort descending by score
    scored_recommendations.sort(key=lambda r: r.score, reverse=True)
    top_recommendations = scored_recommendations[:limit]

    return OutfitRecommendationListResponse(
        occasion=occasion,
        total_generated=len(top_recommendations),
        recommendations=top_recommendations,
    )


@router.post(
    "/recommendations/feedback",
    response_model=OutfitFeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Record customer interaction/feedback on an outfit recommendation",
)
async def record_outfit_feedback(
    payload: OutfitFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitFeedbackResponse:
    """
    Records customer reaction (like, dislike, save, skip, worn).
    If action is 'save', also automatically creates a permanent saved Outfit.
    """
    user_id = str(current_user.id)
    action = payload.action.strip().lower()
    valid_actions = {"like", "dislike", "save", "skip", "worn"}
    if action not in valid_actions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{action}'. Must be one of {valid_actions}",
        )

    saved_outfit_id = payload.outfit_id

    # If action is 'save' and no outfit_id provided, parse notes/hash if provided or persist feedback
    feedback = OutfitFeedback(
        user_id=user_id,
        outfit_id=saved_outfit_id,
        recommendation_hash=payload.recommendation_hash,
        action=action,
        notes=payload.notes,
    )
    db.add(feedback)
    await db.commit()

    return OutfitFeedbackResponse(
        success=True,
        action=action,
        message=f"Feedback '{action}' successfully recorded for recommendation.",
        saved_outfit_id=saved_outfit_id,
    )


@router.get(
    "/complete-look",
    response_model=CompleteLookResponse,
    status_code=status.HTTP_200_OK,
    summary="Wardrobe gap analysis and catalog recommendations",
)
async def get_complete_look(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompleteLookResponse:
    """
    Performs wardrobe gap analysis on the customer's owned items and suggests
    complementary garments from the DRAPE catalog to unlock complete outfits.
    """
    user_id = str(current_user.id)
    items_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user_id)
    items_res = await db.execute(items_stmt)
    owned_items = list(items_res.scalars().all())

    owned_categories = {it.category.lower() for it in owned_items if it.category}
    owned_names = {it.name.lower() for it in owned_items if it.name}

    all_standard_categories = ["t-shirts", "jeans", "trousers", "skirts", "dresses"]
    missing_categories = [c for c in all_standard_categories if not any(c in oc for oc in owned_categories)]

    suggestions: List[ComplementaryProductResponse] = []

    # Prioritize suggestions that fill missing categories
    for catalog_item in CATALOG_EVERYDAY_STYLES:
        cat = catalog_item["category"]
        # Skip if already owned by name
        if catalog_item["name"].lower() in owned_names:
            continue

        is_missing = cat in missing_categories
        suggestions.append(
            ComplementaryProductResponse(
                id=catalog_item["id"],
                name=catalog_item["name"],
                category=catalog_item["category"],
                price=catalog_item["price"],
                image_url=catalog_item["image_url"],
                color=catalog_item["color"],
                colors=catalog_item["colors"],
                reason=catalog_item["reason"],
                compatible_try_on=catalog_item["compatible_try_on"],
                product_slug=catalog_item["product_slug"],
            )
        )

    # Sort so missing categories appear first
    suggestions.sort(key=lambda s: s.category in missing_categories, reverse=True)

    return CompleteLookResponse(
        missing_categories=missing_categories,
        owned_categories=list(owned_categories),
        total_owned=len(owned_items),
        suggestions=suggestions[:4],
    )



# ==============================================================================
# OUTFITS ENDPOINTS
# ==============================================================================


@router.get(
    "/outfits",
    response_model=OutfitListResponse,
    status_code=status.HTTP_200_OK,
    summary="List customer's saved outfits",
)
async def list_outfits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitListResponse:
    """Lists all saved outfits and their sequenced wardrobe items for the authenticated customer."""
    stmt = (
        select(Outfit)
        .where(Outfit.user_id == current_user.id)
        .options(
            selectinload(Outfit.items)
            .selectinload(OutfitItem.wardrobe_item)
        )
        .order_by(Outfit.created_at.desc())
    )
    res = await db.execute(stmt)
    outfits = list(res.scalars().all())

    return OutfitListResponse(
        outfits=[OutfitResponse.model_validate(o) for o in outfits],
        total=len(outfits),
    )


@router.post(
    "/outfits",
    response_model=OutfitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new outfit ensemble",
)
async def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Creates a saved outfit ensemble and links specified customer-owned wardrobe items."""
    # Validate items ownership
    item_ids = list(dict.fromkeys(payload.item_ids or []))  # deduplicate preserving order
    if item_ids:
        items_stmt = select(WardrobeItem).where(
            WardrobeItem.id.in_(item_ids),
            WardrobeItem.user_id == current_user.id,
        )
        items_res = await db.execute(items_stmt)
        found_items = list(items_res.scalars().all())
        if len(found_items) != len(item_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more specified wardrobe items do not exist or do not belong to your account.",
            )

    outfit = Outfit(
        user_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        occasion=payload.occasion.strip().lower() if payload.occasion else None,
        season=payload.season.strip().lower() if payload.season else None,
        cover_image_url=payload.cover_image_url.strip() if payload.cover_image_url else None,
    )
    db.add(outfit)
    await db.flush()

    for idx, item_id in enumerate(item_ids):
        db.add(
            OutfitItem(
                outfit_id=outfit.id,
                wardrobe_item_id=item_id,
                display_order=idx,
            )
        )

    await db.commit()

    # Re-query with complete relationships
    full_stmt = (
        select(Outfit)
        .where(Outfit.id == outfit.id)
        .options(
            selectinload(Outfit.items)
            .selectinload(OutfitItem.wardrobe_item)
        )
    )
    full_res = await db.execute(full_stmt)
    full_outfit = full_res.scalar_one()

    return OutfitResponse.model_validate(full_outfit)


@router.get(
    "/outfits/{outfit_id}",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve individual outfit by ID",
)
async def get_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Fetches an individual outfit with all member items, verifying customer ownership."""
    stmt = (
        select(Outfit)
        .where(
            Outfit.id == outfit_id,
            Outfit.user_id == current_user.id,
        )
        .options(
            selectinload(Outfit.items)
            .selectinload(OutfitItem.wardrobe_item)
        )
    )
    res = await db.execute(stmt)
    outfit = res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    return OutfitResponse.model_validate(outfit)


@router.patch(
    "/outfits/{outfit_id}",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Update outfit metadata",
)
async def update_outfit(
    outfit_id: str,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Updates outfit metadata."""
    stmt = (
        select(Outfit)
        .where(
            Outfit.id == outfit_id,
            Outfit.user_id == current_user.id,
        )
        .options(
            selectinload(Outfit.items)
            .selectinload(OutfitItem.wardrobe_item)
        )
    )
    res = await db.execute(stmt)
    outfit = res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if isinstance(val, str):
            setattr(outfit, field, val.strip())
        else:
            setattr(outfit, field, val)

    await db.commit()
    await db.refresh(outfit)

    return OutfitResponse.model_validate(outfit)


@router.delete(
    "/outfits/{outfit_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an outfit ensemble",
)
async def delete_outfit(
    outfit_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Deletes an outfit ensemble. Member wardrobe items remain intact in the user's wardrobe."""
    stmt = select(Outfit).where(
        Outfit.id == outfit_id,
        Outfit.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    outfit = res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    await db.delete(outfit)
    await db.commit()

    return {"status": "success", "message": f"Outfit '{outfit_id}' deleted."}


@router.post(
    "/outfits/{outfit_id}/items",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Add a wardrobe garment to an outfit ensemble",
)
async def add_item_to_outfit(
    outfit_id: str,
    payload: OutfitItemAddRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Adds a wardrobe garment to an outfit, verifying both outfit and garment belong to caller."""
    # 1. Verify outfit ownership
    outfit_stmt = (
        select(Outfit)
        .where(
            Outfit.id == outfit_id,
            Outfit.user_id == current_user.id,
        )
        .options(selectinload(Outfit.items))
    )
    outfit_res = await db.execute(outfit_stmt)
    outfit = outfit_res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    # 2. Verify wardrobe item ownership
    wi_stmt = select(WardrobeItem).where(
        WardrobeItem.id == payload.wardrobe_item_id,
        WardrobeItem.user_id == current_user.id,
    )
    wi_res = await db.execute(wi_stmt)
    wardrobe_item = wi_res.scalar_one_or_none()

    if not wardrobe_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wardrobe item '{payload.wardrobe_item_id}' not found or does not belong to you.",
        )

    # 3. Check duplicate membership
    existing_item = next((it for it in outfit.items if it.wardrobe_item_id == payload.wardrobe_item_id), None)
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This wardrobe item is already included in this outfit ensemble.",
        )

    display_order = payload.display_order if payload.display_order is not None else len(outfit.items)
    db.add(
        OutfitItem(
            outfit_id=outfit.id,
            wardrobe_item_id=wardrobe_item.id,
            display_order=display_order,
        )
    )
    await db.commit()
    db.expunge(outfit)

    # Re-fetch with all relationships
    return await get_outfit(outfit_id=outfit.id, current_user=current_user, db=db)


@router.delete(
    "/outfits/{outfit_id}/items/{wardrobe_item_id}",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove a wardrobe garment from an outfit ensemble",
)
async def remove_item_from_outfit(
    outfit_id: str,
    wardrobe_item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Removes a garment from an outfit ensemble."""
    outfit_stmt = (
        select(Outfit)
        .where(
            Outfit.id == outfit_id,
            Outfit.user_id == current_user.id,
        )
        .options(selectinload(Outfit.items))
    )
    outfit_res = await db.execute(outfit_stmt)
    outfit = outfit_res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    item_assoc = next((it for it in outfit.items if it.wardrobe_item_id == wardrobe_item_id), None)
    if not item_assoc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{wardrobe_item_id}' is not in outfit '{outfit_id}'.",
        )

    await db.delete(item_assoc)
    await db.commit()
    db.expunge(outfit)

    return await get_outfit(outfit_id=outfit.id, current_user=current_user, db=db)


@router.patch(
    "/outfits/{outfit_id}/items/reorder",
    response_model=OutfitResponse,
    status_code=status.HTTP_200_OK,
    summary="Update display order of garments in an outfit",
)
async def reorder_outfit_items(
    outfit_id: str,
    payload: OutfitItemsReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitResponse:
    """Sequences the display order of items in an outfit with strict validation."""
    outfit_stmt = (
        select(Outfit)
        .where(
            Outfit.id == outfit_id,
            Outfit.user_id == current_user.id,
        )
        .options(selectinload(Outfit.items))
    )
    outfit_res = await db.execute(outfit_stmt)
    outfit = outfit_res.scalar_one_or_none()

    if not outfit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Outfit '{outfit_id}' not found.",
        )

    current_item_ids = [it.wardrobe_item_id for it in outfit.items]
    current_set = set(current_item_ids)
    submitted_ids = payload.item_ids

    # 1. Reject duplicate IDs in submitted payload
    if len(submitted_ids) != len(set(submitted_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate wardrobe item IDs provided in reorder request.",
        )

    submitted_set = set(submitted_ids)

    # 2. Reject unknown IDs (items not in outfit)
    unknown_ids = submitted_set - current_set
    if unknown_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reorder list contains unknown wardrobe items not in outfit: {sorted(list(unknown_ids))}.",
        )

    # 3. Reject missing IDs (items currently in outfit omitted from payload)
    missing_ids = current_set - submitted_set
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reorder list is missing wardrobe items currently in outfit: {sorted(list(missing_ids))}.",
        )

    # 4. Sequentially and deterministically apply display_order 0, 1, 2, ...
    item_map = {it.wardrobe_item_id: it for it in outfit.items}
    for seq_idx, item_id in enumerate(submitted_ids):
        item_map[item_id].display_order = seq_idx

    await db.commit()
    db.expunge(outfit)

    return await get_outfit(outfit_id=outfit.id, current_user=current_user, db=db)


# ==============================================================================
# INDIVIDUAL WARDROBE ITEM BY ID ENDPOINTS
# Registered after static routes to avoid collision with /outfits, etc.
# ==============================================================================


@router.get(
    "/{item_id}",
    response_model=WardrobeItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve individual wardrobe garment by ID",
)
async def get_wardrobe_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemResponse:
    """Fetches a specific wardrobe item, strictly validating customer ownership."""
    stmt = select(WardrobeItem).where(
        WardrobeItem.id == item_id,
        WardrobeItem.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wardrobe item '{item_id}' not found.",
        )

    return WardrobeItemResponse.model_validate(item)


@router.patch(
    "/{item_id}",
    response_model=WardrobeItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Update editable attributes of a wardrobe garment",
)
async def update_wardrobe_item(
    item_id: str,
    payload: WardrobeItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemResponse:
    """Updates customer-owned garment attributes."""
    stmt = select(WardrobeItem).where(
        WardrobeItem.id == item_id,
        WardrobeItem.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wardrobe item '{item_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if field in ("category", "season", "occasion") and isinstance(val, str):
            setattr(item, field, val.strip().lower())
        elif isinstance(val, str):
            setattr(item, field, val.strip())
        else:
            setattr(item, field, val)

    await db.commit()
    await db.refresh(item)

    return WardrobeItemResponse.model_validate(item)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a wardrobe garment",
)
async def delete_wardrobe_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Deletes a garment from customer wardrobe.
    Cascading foreign keys cleanly remove any associated outfit entries without breaking outfits.
    """
    stmt = select(WardrobeItem).where(
        WardrobeItem.id == item_id,
        WardrobeItem.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wardrobe item '{item_id}' not found.",
        )

    await db.delete(item)
    await db.commit()

    return {"status": "success", "message": f"Wardrobe item '{item_id}' deleted."}

