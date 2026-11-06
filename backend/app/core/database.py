"""
DRAPE Database Foundation Module.

Configures asynchronous SQLAlchemy engine, session management, and connection
lifecycle checks conforming to ADR-002 and SYSTEM_ARCHITECTURE.md §3.1.
"""

from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings
from app.core.logging import logger

# Build async engine with connection pooling options
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,  # Discards stale connections
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all future SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields a transaction-scoped database session."""
    async with AsyncSessionLocal() as session:
        yield session


async def check_database_connection() -> bool:
    """
    Tests direct database reachability.
    
    Executes a lightweight query (SELECT 1). Returns True if connected,
    False if unreachable or connection fails.
    """
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as exc:
        logger.warning(
            "Database connection check failed",
            extra={"error": str(exc)},
        )
        return False

