"""
DRAPE FastAPI Dependency Injection Module.

Provides database sessions, identity adapter instances, and authenticated
customer security dependencies conforming to RFC 9457 error contracts.
"""

from typing import Optional
from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.domain.models.identity import User
from app.domain.ports.identity_port import IdentityPort, UserSession
from app.domain.ports.payment_gateway_port import PaymentGatewayPort
from app.domain.ports.tax_calculation_port import TaxCalculationPort
from app.infrastructure.adapters.sqlalchemy_identity_adapter import (
    SqlAlchemyIdentityAdapter,
)
from app.infrastructure.adapters.razorpay_payment_adapter import (
    RazorpayPaymentAdapter,
)
from app.infrastructure.adapters.static_tax_adapter import (
    StaticTaxAdapter,
)

# Singleton/factory provider for production identity adapter
_identity_adapter: Optional[IdentityPort] = None
_payment_gateway: Optional[PaymentGatewayPort] = None
_tax_calculator: Optional[TaxCalculationPort] = None


def get_identity_adapter() -> IdentityPort:
    """Dependency yielding the active IdentityPort implementation."""
    global _identity_adapter
    if _identity_adapter is None:
        _identity_adapter = SqlAlchemyIdentityAdapter()
    return _identity_adapter


def set_identity_adapter(adapter: IdentityPort) -> None:
    """Overrides identity adapter (useful for testing)."""
    global _identity_adapter
    _identity_adapter = adapter


def get_payment_gateway() -> PaymentGatewayPort:
    """Dependency yielding active PaymentGatewayPort implementation."""
    global _payment_gateway
    if _payment_gateway is None:
        _payment_gateway = RazorpayPaymentAdapter(
            key_id=settings.RAZORPAY_KEY_ID,
            key_secret=settings.RAZORPAY_KEY_SECRET,
            webhook_secret=settings.RAZORPAY_WEBHOOK_SECRET,
        )
    return _payment_gateway


def set_payment_gateway(gateway: PaymentGatewayPort) -> None:
    """Overrides payment gateway adapter (useful for testing)."""
    global _payment_gateway
    _payment_gateway = gateway


def get_tax_calculator() -> TaxCalculationPort:
    """Dependency yielding active TaxCalculationPort implementation."""
    global _tax_calculator
    if _tax_calculator is None:
        _tax_calculator = StaticTaxAdapter(default_rate=settings.DEFAULT_TAX_RATE)
    return _tax_calculator


def set_tax_calculator(calculator: TaxCalculationPort) -> None:
    """Overrides tax calculator adapter (useful for testing)."""
    global _tax_calculator
    _tax_calculator = calculator


async def get_current_session(
    request: Request,
    authorization: Optional[str] = Header(None),
    drape_access_token: Optional[str] = Cookie(None),
    identity: IdentityPort = Depends(get_identity_adapter),
) -> UserSession:
    """
    Extracts and cryptographically validates access token.
    
    Checks 'Authorization: Bearer <token>' header first, falls back to
    HttpOnly cookie 'drape_access_token'.
    """
    token: Optional[str] = None

    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif drape_access_token:
        token = drape_access_token.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        session = await identity.verify_token(token)
        return session
    except TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except (PermissionError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_current_user(
    session: UserSession = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Retrieves full User ORM model for current verified session.
    
    Guarantees that user exists and is active.
    """
    result = await db.execute(select(User).where(User.id == session.user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user

