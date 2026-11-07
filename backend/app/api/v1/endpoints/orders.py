"""
DRAPE Order History & Detail Endpoints.

Provides customer order history retrieval, verified order status lookup,
and historical product snapshot inspection. Enforces customer isolation.
Conforms to ADR-001, ADR-002, and SYSTEM_ARCHITECTURE.md.
"""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_identity_adapter
from app.api.v1.schemas.order import OrderListResponse, OrderResponse
from app.domain.models.order import Order
from app.domain.ports.identity_port import IdentityPort

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=OrderListResponse)
async def list_customer_orders(
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> OrderListResponse:
    """Lists all historical orders belonging to the authenticated customer."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view order history.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        session = await identity.verify_token(token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    result = await db.execute(
        select(Order)
        .where(Order.user_id == session.user_id)
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
        .order_by(Order.created_at.desc())
    )
    orders = list(result.scalars().all())

    return OrderListResponse(
        orders=orders,
        total=len(orders),
    )


@router.get("/{id_or_number}", response_model=OrderResponse)
async def get_order_by_id_or_number(
    id_or_number: str,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    x_guest_token: Optional[str] = Header(None),
    drape_guest_token: Optional[str] = Cookie(None),
    db: AsyncSession = Depends(get_db),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> Order:
    """
    Retrieves full verified order details by UUID or order reference number.
    Ensures that customer orders can only be accessed by their rightful owner.
    """
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    user_id = None
    if token:
        try:
            session = await identity.verify_token(token)
            user_id = session.user_id
        except Exception:
            user_id = None

    result = await db.execute(
        select(Order)
        .where(
            or_(
                Order.id == id_or_number,
                Order.order_number == id_or_number,
            )
        )
        .options(
            selectinload(Order.items),
            selectinload(Order.payments),
            selectinload(Order.status_history),
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found.",
        )

    # Customer isolation: if order is attached to a registered user, enforce caller is that user
    if order.user_id:
        if not user_id or order.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or does not belong to your account.",
            )
    elif order.guest_token:
        # For guest orders, enforce matching cryptographic guest token
        caller_guest = x_guest_token or drape_guest_token
        if not caller_guest or caller_guest != order.guest_token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found or unauthorized guest access.",
            )
    else:
        # If order has no user_id and no guest_token, require valid user
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

    return order

