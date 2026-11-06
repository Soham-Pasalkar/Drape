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

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.api.v1.schemas.wardrobe import (
    ImportPurchasesResponse,
    OutfitCreate,
    OutfitItemAddRequest,
    OutfitItemsReorderRequest,
    OutfitListResponse,
    OutfitResponse,
    OutfitUpdate,
    WardrobeItemCreate,
    WardrobeItemListResponse,
    WardrobeItemResponse,
    WardrobeItemUpdate,
)
from app.domain.models.catalog import Product
from app.domain.models.identity import User
from app.domain.models.order import Order, OrderItem
from app.domain.models.wardrobe import Outfit, OutfitItem, WardrobeItem

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


def _build_wardrobe_item_from_snapshot(
    snapshot: Dict[str, Any],
    user_id: str,
    product: Optional[Product] = None,
) -> WardrobeItem:
    """Helper to construct a purchased WardrobeItem from an eligible order item snapshot and optional Product metadata."""
    category = product.category if product else "garment"
    brand = product.brand if product else "DRAPE Atelier"
    material = product.material if product else None
    description = (
        product.description
        if product
        else f"Acquired via DRAPE order {snapshot['order_number']}"
    )

    return WardrobeItem(
        user_id=user_id,
        product_id=snapshot["product_id"],
        order_item_id=snapshot["id"],
        source="purchased",
        name=snapshot["product_name"],
        brand=brand,
        category=category,
        description=description,
        color=snapshot["color"],
        size=snapshot["size"],
        material=material,
        image_url=snapshot["image_url"],
        purchase_date=snapshot["purchase_date"],
    )


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

