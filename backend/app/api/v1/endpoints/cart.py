"""
DRAPE Shopping Cart Endpoints.

Implements /api/v1/cart endpoints for persistent authenticated customer carts
and guest session carts, inventory reservation checks, line item management,
server-side price integrity, and seamless post-login guest cart merging.
Conforms to ADR-001, ADR-002, and Milestone 2 requirements.
"""

import asyncio
import secrets
from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_identity_adapter
from app.api.v1.schemas.cart import (
    AddToCartRequest,
    CartItemResponseSchema,
    CartResponseSchema,
    MergeCartRequest,
    UpdateCartItemRequest,
)
from app.domain.models.cart import Cart, CartItem
from app.domain.models.catalog import Inventory, Product, ProductVariant
from app.domain.ports.identity_port import IdentityPort

router = APIRouter(prefix="/cart", tags=["Shopping Cart"])

# Concurrency locks per variant to serialize in-process inventory checks
_variant_locks: dict[str, asyncio.Lock] = {}


def get_variant_lock(variant_id: str) -> asyncio.Lock:
    """Retrieves or creates a thread/task-safe async lock for a variant, safe across pytest event loops."""
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    lock = _variant_locks.get(variant_id)
    if lock is None or (
        current_loop is not None
        and getattr(lock, "_loop", None) is not None
        and lock._loop is not current_loop
    ):
        lock = asyncio.Lock()
        _variant_locks[variant_id] = lock
    return lock


async def resolve_cart(
    db: AsyncSession,
    identity: IdentityPort,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    response: Optional[Response] = None,
) -> tuple[Cart, Optional[str]]:
    """
    Resolves or initializes a Cart instance based on customer authentication
    or guest token header/cookie.
    """
    user_id: Optional[str] = None

    # Check authentication
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    if token:
        try:
            session = await identity.verify_token(token)
            user_id = session.user_id
        except Exception:
            user_id = None

    if user_id:
        # Authenticated customer cart
        stmt = (
            select(Cart)
            .where(Cart.user_id == user_id)
            .options(
                selectinload(Cart.items)
                .selectinload(CartItem.variant)
                .selectinload(ProductVariant.product)
                .selectinload(Product.images),
                selectinload(Cart.items)
                .selectinload(CartItem.variant)
                .selectinload(ProductVariant.inventory),
            )
        )
        result = await db.execute(stmt)
        cart = result.scalar_one_or_none()

        if not cart:
            cart = Cart(user_id=user_id)
            db.add(cart)
            await db.commit()
            await db.refresh(cart)

        return cart, user_id

    # Guest cart resolution
    effective_guest_token = (x_guest_token or drape_guest_token or "").strip()
    if not effective_guest_token or effective_guest_token in ("null", "undefined"):
        effective_guest_token = f"gst_{secrets.token_hex(24)}"
        if response:
            response.set_cookie(
                key="drape_guest_token",
                value=effective_guest_token,
                max_age=30 * 24 * 60 * 60,  # 30 days
                httponly=True,
                samesite="lax",
                path="/",
            )

    stmt = (
        select(Cart)
        .where(Cart.guest_token == effective_guest_token, Cart.user_id.is_(None))
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
            .selectinload(Product.images),
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory),
        )
    )
    result = await db.execute(stmt)
    cart = result.scalar_one_or_none()

    if not cart:
        cart = Cart(guest_token=effective_guest_token)
        db.add(cart)
        await db.commit()
        await db.refresh(cart)

    return cart, None


def format_cart_response(cart: Cart) -> CartResponseSchema:
    """Computes validated prices, lines, and subtotals directly from DB."""
    formatted_items = []
    subtotal = 0.0
    total_count = 0

    for item in cart.items:
        variant = item.variant
        if not variant or not variant.product:
            continue

        product = variant.product
        qty_available = variant.inventory.quantity if variant.inventory else 0
        in_stock = qty_available >= item.quantity

        unit_price = float(product.price)
        line_total = round(unit_price * item.quantity, 2)
        subtotal += line_total
        total_count += item.quantity

        # Primary thumbnail
        primary_img = None
        if product.images:
            sorted_imgs = sorted(product.images, key=lambda x: (not x.is_primary, x.display_order))
            primary_img = sorted_imgs[0].image_url

        formatted_items.append(
            CartItemResponseSchema(
                id=item.id,
                variant_id=variant.id,
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                sku=variant.sku,
                size=variant.size,
                color=variant.color,
                color_code=variant.color_code,
                unit_price=unit_price,
                currency=product.currency,
                quantity=item.quantity,
                line_total=line_total,
                primary_image=primary_img,
                available_quantity=qty_available,
                in_stock=in_stock,
            )
        )

    return CartResponseSchema(
        id=cart.id,
        guest_token=cart.guest_token,
        items=formatted_items,
        total_items=total_count,
        subtotal=round(subtotal, 2),
        currency="USD",
    )


@router.get(
    "",
    response_model=CartResponseSchema,
    summary="Retrieve active customer or guest cart",
)
async def get_cart(
    response: Response,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> CartResponseSchema:
    """Returns the current shopping cart with server-validated pricing."""
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
        response=response,
    )
    return format_cart_response(cart)


@router.post(
    "/items",
    response_model=CartResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Add product variant to cart",
)
async def add_cart_item(
    payload: AddToCartRequest,
    response: Response,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> CartResponseSchema:
    """Adds a line item to the cart or increments existing quantity with stock checks."""
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
        response=response,
    )

    async with get_variant_lock(payload.variant_id):
        # 1. Row-lock inventory for target variant to serialize concurrent additions
        inv_stmt = (
            select(Inventory)
            .where(Inventory.variant_id == payload.variant_id)
            .with_for_update()
        )
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalar_one_or_none()

        # 2. Verify variant exists and is active
        variant_stmt = (
            select(ProductVariant)
            .where(ProductVariant.id == payload.variant_id)
            .options(
                selectinload(ProductVariant.product),
                selectinload(ProductVariant.inventory),
            )
        )
        variant_res = await db.execute(variant_stmt)
        variant = variant_res.scalar_one_or_none()

        if not variant or not variant.is_active or not variant.product.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The requested product variant is unavailable.",
            )

        # 3. Calculate remaining inventory accounting for units claimed in OTHER carts
        other_carts_stmt = (
            select(func.coalesce(func.sum(CartItem.quantity), 0))
            .where(
                CartItem.variant_id == payload.variant_id,
                CartItem.cart_id != cart.id,
            )
        )
        other_carts_res = await db.execute(other_carts_stmt)
        held_in_other_carts = other_carts_res.scalar() or 0

        total_stock = inv.quantity if inv else 0
        available_qty = max(0, total_stock - held_in_other_carts)

        # 4. Check if variant already exists in cart
        existing_item = next((item for item in cart.items if item.variant_id == payload.variant_id), None)

        if existing_item:
            target_qty = existing_item.quantity + payload.quantity
            if target_qty > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot add {payload.quantity} more. Only {available_qty} items available in stock.",
                )
            existing_item.quantity = target_qty
        else:
            if payload.quantity > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot add {payload.quantity} items. Only {available_qty} items available in stock.",
                )
            new_item = CartItem(
                cart_id=cart.id,
                variant_id=payload.variant_id,
                quantity=payload.quantity,
            )
            db.add(new_item)

        await db.commit()
        db.expire_all()

    # Re-fetch cart with full eager loads
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
    )
    return format_cart_response(cart)


@router.patch(
    "/items/{item_id}",
    response_model=CartResponseSchema,
    summary="Update cart item quantity or variant",
)
async def update_cart_item(
    item_id: str,
    payload: UpdateCartItemRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> CartResponseSchema:
    """Updates line item quantity or switches variant with inventory validation."""
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
    )

    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found.",
        )

    target_variant_id = payload.variant_id or item.variant_id

    async with get_variant_lock(target_variant_id):
        # 1. Lock inventory row for target variant
        inv_stmt = (
            select(Inventory)
            .where(Inventory.variant_id == target_variant_id)
            .with_for_update()
        )
        inv_res = await db.execute(inv_stmt)
        inv = inv_res.scalar_one_or_none()
        total_stock = inv.quantity if inv else 0

        # 2. Units in other carts
        other_carts_stmt = (
            select(func.coalesce(func.sum(CartItem.quantity), 0))
            .where(
                CartItem.variant_id == target_variant_id,
                CartItem.cart_id != cart.id,
            )
        )
        other_carts_res = await db.execute(other_carts_stmt)
        held_in_other_carts = other_carts_res.scalar() or 0
        available_qty = max(0, total_stock - held_in_other_carts)

        # Variant switch
        if payload.variant_id and payload.variant_id != item.variant_id:
            new_variant_stmt = (
                select(ProductVariant)
                .where(ProductVariant.id == payload.variant_id)
                .options(selectinload(ProductVariant.inventory))
            )
            new_var_res = await db.execute(new_variant_stmt)
            new_variant = new_var_res.scalar_one_or_none()
            if not new_variant or not new_variant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected replacement variant is unavailable.",
                )
            if item.quantity > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot switch variant. Only {available_qty} available in stock.",
                )
            item.variant_id = payload.variant_id

        # Quantity update
        if payload.quantity is not None:
            if payload.quantity > available_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested quantity ({payload.quantity}) exceeds available stock ({available_qty}).",
                )
            item.quantity = payload.quantity

        await db.commit()
        db.expire_all()

    # Re-fetch cart
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
    )
    return format_cart_response(cart)


@router.delete(
    "/items/{item_id}",
    response_model=CartResponseSchema,
    summary="Remove item from cart",
)
async def remove_cart_item(
    item_id: str,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> CartResponseSchema:
    """Removes a line item from the active cart."""
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
    )

    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found.",
        )

    await db.delete(item)
    await db.commit()
    db.expire_all()

    # Re-fetch cart
    cart, _ = await resolve_cart(
        db=db,
        identity=identity,
        authorization=authorization,
        drape_access_token=drape_access_token,
        x_guest_token=x_guest_token,
        drape_guest_token=drape_guest_token,
    )
    return format_cart_response(cart)


@router.post(
    "/merge",
    response_model=CartResponseSchema,
    summary="Merge guest cart into authenticated customer cart",
)
async def merge_guest_cart(
    payload: MergeCartRequest,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> CartResponseSchema:
    """
    Merges items from a guest cart into the authenticated customer's cart
    following user login.
    """
    # 1. Customer must be authenticated
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to merge guest cart.",
        )

    session = await identity.verify_token(token)
    user_id = session.user_id

    # 2. Get customer cart
    user_cart_stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory)
        )
    )
    user_cart_res = await db.execute(user_cart_stmt)
    user_cart = user_cart_res.scalar_one_or_none()

    if not user_cart:
        user_cart = Cart(user_id=user_id)
        db.add(user_cart)
        await db.flush()
        user_items_map = {}
    else:
        user_items_map = {item.variant_id: item for item in user_cart.items}

    # 3. Find guest cart
    guest_stmt = (
        select(Cart)
        .where(Cart.guest_token == payload.guest_token)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory)
        )
    )
    guest_res = await db.execute(guest_stmt)
    guest_cart = guest_res.scalar_one_or_none()

    try:
        if guest_cart and guest_cart.items:
            for guest_item in guest_cart.items:
                # Row-lock inventory
                inv_stmt = (
                    select(Inventory)
                    .where(Inventory.variant_id == guest_item.variant_id)
                    .with_for_update()
                )
                inv_res = await db.execute(inv_stmt)
                inv = inv_res.scalar_one_or_none()
                total_stock = inv.quantity if inv else 0

                # Check other carts (excluding both user cart and guest cart being merged)
                other_carts_stmt = (
                    select(func.coalesce(func.sum(CartItem.quantity), 0))
                    .where(
                        CartItem.variant_id == guest_item.variant_id,
                        CartItem.cart_id.not_in([user_cart.id, guest_cart.id]),
                    )
                )
                other_res = await db.execute(other_carts_stmt)
                held = other_res.scalar() or 0
                available_qty = max(0, total_stock - held)

                if guest_item.variant_id in user_items_map:
                    existing = user_items_map[guest_item.variant_id]
                    new_qty = min(existing.quantity + guest_item.quantity, available_qty)
                    if new_qty > 0:
                        existing.quantity = new_qty
                else:
                    qty = min(guest_item.quantity, available_qty)
                    if qty > 0:
                        new_user_item = CartItem(
                            cart_id=user_cart.id,
                            variant_id=guest_item.variant_id,
                            quantity=qty,
                        )
                        db.add(new_user_item)
                        user_items_map[guest_item.variant_id] = new_user_item

            # Delete guest cart after merge
            await db.delete(guest_cart)

        await db.commit()
    except Exception:
        await db.rollback()
        raise

    db.expire_all()

    # Re-fetch user cart
    stmt = (
        select(Cart)
        .where(Cart.user_id == user_id)
        .options(
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.product)
            .selectinload(Product.images),
            selectinload(Cart.items)
            .selectinload(CartItem.variant)
            .selectinload(ProductVariant.inventory),
        )
    )
    res = await db.execute(stmt)
    final_cart = res.scalar_one()
    return format_cart_response(final_cart)
