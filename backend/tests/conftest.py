"""
Pytest configuration and fixtures for DRAPE backend tests.

Configures an isolated in-memory asynchronous SQLite engine with full table
schema initialization and FastAPI dependency overrides for get_db and get_identity_adapter.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db, get_identity_adapter
from app.core.database import Base
from app.domain.models import User, UserConsent, UserSession  # Ensure models loaded
from app.infrastructure.adapters.sqlalchemy_identity_adapter import (
    SqlAlchemyIdentityAdapter,
)
from app.main import app

# In-memory async SQLite engine with static pool to retain memory DB across sessions
test_engine = create_async_engine(
    "sqlite+aiosqlite:///file:memdb_drape?mode=memory&cache=shared&uri=true",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

test_identity_adapter = SqlAlchemyIdentityAdapter(session_factory=TestingSessionLocal)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def initialize_test_database():
    """Initializes tables on in-memory SQLite engine once for test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def db_session():
    """Yields an isolated async session for test assertions."""
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    """Async test client bound to FastAPI application with test database overrides."""
    async def override_get_db():
        async with TestingSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_identity_adapter] = lambda: test_identity_adapter

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()
