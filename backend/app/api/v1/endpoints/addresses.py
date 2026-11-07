"""
DRAPE Customer Address Management Endpoints.

Provides CRUD and default-address toggle operations for authenticated customers.
Enforces strict customer ownership, data validation, and single-default integrity.
Conforms to ADR-001, ADR-002, and RFC 9457 error handling.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.schemas.address import (
    AddressCreateSchema,
    AddressResponseSchema,
    AddressUpdateSchema,
)
from app.core.database import get_db
from app.domain.models.identity import User
from app.domain.models.order import Address

router = APIRouter(prefix="/addresses", tags=["Addresses"])


@router.get("", response_model=List[AddressResponseSchema])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[Address]:
    """Retrieves all saved addresses for the authenticated customer."""
    result = await db.execute(
        select(Address)
        .where(Address.user_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=AddressResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_address(
    payload: AddressCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Address:
    """Creates a new customer address with single-default enforcement."""
    # Check if this is the customer's first address
    count_res = await db.execute(
        select(Address).where(Address.user_id == current_user.id)
    )
    existing_addresses = count_res.scalars().all()
    
    # If first address or is_default is requested, ensure no multiple defaults
    should_be_default = payload.is_default or len(existing_addresses) == 0
    if should_be_default:
        await db.execute(
            update(Address)
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )

    new_address = Address(
        user_id=current_user.id,
        full_name=payload.full_name.strip(),
        phone=payload.phone.strip(),
        line1=payload.line1.strip(),
        line2=payload.line2.strip() if payload.line2 else None,
        city=payload.city.strip(),
        state=payload.state.strip(),
        postal_code=payload.postal_code.strip(),
        country=payload.country.strip(),
        address_type=payload.address_type.strip().lower(),
        is_default=should_be_default,
    )

    db.add(new_address)
    await db.commit()
    await db.refresh(new_address)
    return new_address


@router.patch("/{address_id}", response_model=AddressResponseSchema)
async def update_address(
    address_id: str,
    payload: AddressUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Address:
    """Updates an existing address belonging to the authenticated customer."""
    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to your account.",
        )

    data = payload.model_dump(exclude_unset=True)

    if data.get("is_default") is True:
        await db.execute(
            update(Address)
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )

    for field, val in data.items():
        if val is not None:
            if isinstance(val, str):
                val = val.strip()
            setattr(address, field, val)

    await db.commit()
    await db.refresh(address)
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Deletes an address belonging to the authenticated customer."""
    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to your account.",
        )

    was_default = address.is_default
    await db.delete(address)
    await db.commit()

    # If deleted address was default, promote the newest remaining address
    if was_default:
        remain_res = await db.execute(
            select(Address)
            .where(Address.user_id == current_user.id)
            .order_by(Address.created_at.desc())
            .limit(1)
        )
        remaining = remain_res.scalar_one_or_none()
        if remaining:
            remaining.is_default = True
            await db.commit()


@router.post("/{address_id}/default", response_model=AddressResponseSchema)
async def set_default_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Address:
    """Promotes an address to be the primary default shipping address."""
    result = await db.execute(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id,
        )
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found or does not belong to your account.",
        )

    await db.execute(
        update(Address)
        .where(Address.user_id == current_user.id)
        .values(is_default=False)
    )
    address.is_default = True
    await db.commit()
    await db.refresh(address)
    return address

