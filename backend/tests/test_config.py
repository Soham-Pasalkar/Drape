"""Tests for configuration parsing and CORS assembly."""

from app.core.config import Settings


def test_cors_origins_parsing():
    """Settings must parse string and list formats of CORS origins."""
    s1 = Settings(BACKEND_CORS_ORIGINS="http://localhost:3000,http://app.drape.fashion")
    assert s1.BACKEND_CORS_ORIGINS == [
        "http://localhost:3000",
        "http://app.drape.fashion",
    ]

    s2 = Settings(BACKEND_CORS_ORIGINS=["http://localhost:3000"])
    assert s2.BACKEND_CORS_ORIGINS == ["http://localhost:3000"]


def test_default_settings():
    """Settings must provide safe default values."""
    s = Settings()
    assert s.PROJECT_NAME == "DRAPE API"
    assert s.VERSION == "0.1.0"
    assert s.API_V1_STR == "/api/v1"
    assert "postgresql+asyncpg://" in s.DATABASE_URL

