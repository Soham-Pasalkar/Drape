"""
DRAPE Public Product Catalog Endpoints.

Implements /api/v1/products endpoints for catalog browsing, multi-faceted filtering
(category, price, size, colour), lexical search, sorting, pagination, and
detailed product/variant inspection with live inventory checks.
Conforms to ADR-001, ADR-007, and Milestone 2 requirements.
"""

import hmac
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_identity_adapter
from app.core.config import settings
from app.domain.ports.identity_port import IdentityPort
from app.api.v1.schemas.catalog import (
    CategoryItemSchema,
    ColorOptionSchema,
    ProductDetailSchema,
    ProductImageSchema,
    ProductListResponseSchema,
    ProductSummarySchema,
    ProductVariantSchema,
)
from app.db.seed import seed_catalog
from app.domain.models.catalog import Inventory, Product, ProductImage, ProductVariant

router = APIRouter(prefix="/products", tags=["Product Catalog"])


@router.get(
    "",
    response_model=ProductListResponseSchema,
    summary="List and filter catalog products",
)
async def list_products(
    category: Optional[str] = Query(None, description="Filter by product category"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    size: Optional[str] = Query(None, description="Filter by variant size"),
    color: Optional[str] = Query(None, description="Filter by variant colour"),
    search: Optional[str] = Query(None, description="Keyword search across name and description"),
    sort_by: str = Query(
        "featured",
        pattern="^(featured|price_asc|price_desc|newest)$",
        description="Sort order",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(12, ge=1, le=50, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> ProductListResponseSchema:
    """
    Returns active catalog products with multi-faceted filtering, sorting,
    and pagination.
    """
    # Base query for active products
    base_query = (
        select(Product)
        .where(Product.is_active == True)  # noqa: E712
        .options(
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.inventory),
        )
    )

    # 1. Category Filter
    if category and category.strip().lower() != "all":
        base_query = base_query.where(Product.category == category.strip().lower())

    # 2. Price Range Filter
    if min_price is not None:
        base_query = base_query.where(Product.price >= min_price)
    if max_price is not None:
        base_query = base_query.where(Product.price <= max_price)

    # 3. Size and Colour Variant Filters
    if size or color:
        variant_conditions = [ProductVariant.product_id == Product.id, ProductVariant.is_active == True]  # noqa: E712
        if size:
            variant_conditions.append(func.lower(ProductVariant.size) == size.strip().lower())
        if color:
            variant_conditions.append(func.lower(ProductVariant.color) == color.strip().lower())

        variant_subquery = (
            select(ProductVariant.product_id)
            .where(*variant_conditions)
            .distinct()
        )
        base_query = base_query.where(Product.id.in_(variant_subquery))

    # 4. Keyword Search
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        base_query = base_query.where(
            or_(
                func.lower(Product.name).like(term),
                func.lower(Product.description).like(term),
                func.lower(Product.material).like(term),
                func.lower(Product.brand).like(term),
            )
        )

    # Count total matching products for pagination
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 5. Sorting
    if sort_by == "price_asc":
        base_query = base_query.order_by(Product.price.asc(), Product.name.asc())
    elif sort_by == "price_desc":
        base_query = base_query.order_by(Product.price.desc(), Product.name.asc())
    elif sort_by == "newest":
        base_query = base_query.order_by(Product.created_at.desc())
    else:  # "featured"
        base_query = base_query.order_by(Product.featured.desc(), Product.created_at.desc())

    # 6. Pagination
    offset = (page - 1) * page_size
    paginated_query = base_query.offset(offset).limit(page_size)
    result = await db.execute(paginated_query)
    products = result.scalars().all()

    # Retrieve all distinct active categories for frontend filters
    cat_stmt = (
        select(Product.category)
        .distinct()
        .where(Product.is_active == True)  # noqa: E712
        .order_by(Product.category.asc())
    )
    cat_result = await db.execute(cat_stmt)
    all_categories = [c for c in cat_result.scalars().all()]

    # Format output items
    items: List[ProductSummarySchema] = []
    for p in products:
        # Determine primary image
        primary_img = None
        sorted_images = sorted(p.images, key=lambda x: (not x.is_primary, x.display_order))
        if sorted_images:
            primary_img = sorted_images[0].image_url

        # Colors and sizes
        color_map = {}
        size_set = set()
        has_stock = False

        for v in p.variants:
            if v.is_active:
                if v.color not in color_map:
                    color_map[v.color] = v.color_code
                size_set.add(v.size)
                qty = v.inventory.quantity if v.inventory else 0
                if qty > 0:
                    has_stock = True

        available_colors = [
            ColorOptionSchema(name=c_name, code=c_code)
            for c_name, c_code in color_map.items()
        ]

        # Standard size ordering
        size_order = {"XS": 1, "S": 2, "M": 3, "L": 4, "XL": 5, "ONE SIZE": 6}
        available_sizes = sorted(list(size_set), key=lambda s: size_order.get(s, 99))

        items.append(
            ProductSummarySchema(
                id=p.id,
                name=p.name,
                slug=p.slug,
                category=p.category,
                brand=p.brand,
                price=float(p.price),
                currency=p.currency,
                material=p.material,
                description=p.description,
                featured=p.featured,
                primary_image=primary_img,
                available_colors=available_colors,
                available_sizes=available_sizes,
                in_stock=has_stock,
                try_on_enabled=p.try_on_enabled,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ProductListResponseSchema(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        categories=all_categories,
    )


@router.get(
    "/categories",
    response_model=List[CategoryItemSchema],
    summary="List categories with product counts",
)
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> List[CategoryItemSchema]:
    """Returns list of active categories with available item counts."""
    stmt = (
        select(Product.category, func.count(Product.id).label("count"))
        .where(Product.is_active == True)  # noqa: E712
        .group_by(Product.category)
        .order_by(Product.category.asc())
    )
    result = await db.execute(stmt)
    return [
        CategoryItemSchema(
            name=row[0].replace("-", " ").title(),
            slug=row[0],
            count=row[1],
        )
        for row in result.all()
    ]


@router.get(
    "/{id_or_slug}",
    response_model=ProductDetailSchema,
    summary="Retrieve product by slug or ID",
)
async def get_product(
    id_or_slug: str,
    db: AsyncSession = Depends(get_db),
) -> ProductDetailSchema:
    """Returns full details, image gallery, and variant inventory for a product."""
    stmt = (
        select(Product)
        .where(
            or_(Product.id == id_or_slug, Product.slug == id_or_slug),
            Product.is_active == True,  # noqa: E712
        )
        .options(
            selectinload(Product.images),
            selectinload(Product.variants).selectinload(ProductVariant.inventory),
        )
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product '{id_or_slug}' not found or is currently inactive.",
        )

    # Format images
    sorted_images = sorted(product.images, key=lambda x: (not x.is_primary, x.display_order))
    images = [
        ProductImageSchema(
            id=img.id,
            image_url=img.image_url,
            alt_text=img.alt_text,
            display_order=img.display_order,
            is_primary=img.is_primary,
        )
        for img in sorted_images
    ]

    # Format variants (active only)
    variants = []
    for var in product.variants:
        if not var.is_active:
            continue
        qty = var.inventory.quantity if var.inventory else 0
        variants.append(
            ProductVariantSchema(
                id=var.id,
                sku=var.sku,
                size=var.size,
                color=var.color,
                color_code=var.color_code,
                is_active=var.is_active,
                available_quantity=qty,
                in_stock=qty > 0,
            )
        )

    return ProductDetailSchema(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        category=product.category,
        brand=product.brand,
        price=float(product.price),
        currency=product.currency,
        material=product.material,
        care_instructions=product.care_instructions,
        featured=product.featured,
        is_active=product.is_active,
        model_3d_url=product.model_3d_url,
        model_3d_format=product.model_3d_format,
        model_3d_status=product.model_3d_status,
        try_on_enabled=product.try_on_enabled,
        images=images,
        variants=variants,
        created_at=product.created_at,
    )


@router.post(
    "/seed",
    summary="Seed catalog with curated luxury items",
    status_code=status.HTTP_200_OK,
)
async def trigger_catalog_seed(
    x_admin_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None),
    replenish_stock: bool = Query(
        False,
        description="Explicitly replenish existing product variant inventory to seed values (admin only).",
    ),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> dict:
    """
    Idempotently populates the database with the curated seed catalog.
    In production environments, access requires an administrative key or admin session.
    Existing inventory is never overwritten in production unless replenish_stock=True.
    """
    is_production = settings.ENVIRONMENT.lower() == "production"

    if is_production:
        is_authorized = False

        # 1. Check administrative API key with timing-safe comparison
        if x_admin_key and settings.ADMIN_API_KEY:
            if hmac.compare_digest(x_admin_key.strip(), settings.ADMIN_API_KEY.strip()):
                is_authorized = True

        # 2. Check admin JWT session
        if not is_authorized and authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
            try:
                session = await identity.verify_token(token)
                if any(role in session.roles for role in ("admin", "system_admin")):
                    is_authorized = True
            except Exception:
                pass

        if not is_authorized:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Catalog seeding is prohibited in production without administrative authorization.",
            )

    replenish_existing = replenish_stock if is_production else True
    result = await seed_catalog(db, replenish_existing_inventory=replenish_existing)
    return {
        "status": "success",
        "message": f"Catalog seeded: {result['created']} created, {result['updated']} updated.",
        "details": result,
    }
