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


def test_cors_wildcard_rejected_with_credentials():
    """Wildcard '*' in CORS origins must be rejected to prevent credential leaks."""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(BACKEND_CORS_ORIGINS="*")

    with pytest.raises(ValidationError):
        Settings(BACKEND_CORS_ORIGINS=["*"])


def test_default_settings():
    """Settings must provide safe default values."""
    s = Settings()
    assert s.PROJECT_NAME == "DRAPE API"
    assert s.VERSION == "0.1.0"
    assert s.API_V1_STR == "/api/v1"
    assert "postgresql+asyncpg://" in s.DATABASE_URL


VALID_PROD_CONFIG = {
    "ENVIRONMENT": "production",
    "DEBUG": False,
    "JWT_SECRET_KEY": "production-secure-unique-jwt-secret-key-32b",
    "ADMIN_API_KEY": "production-admin-api-key-secure-value-32b",
    "DATABASE_URL": "postgresql+asyncpg://drape_prod:prod_secure_pw@db.prod.internal:5432/drape_prod_db",
    "RAZORPAY_KEY_ID": "rzp_live_abcdef123456",
    "RAZORPAY_KEY_SECRET": "real_production_secret_key_12345",
    "RAZORPAY_WEBHOOK_SECRET": "real_production_webhook_secret_67890",
}


def test_production_payment_configuration_validation():
    """Production settings must strictly require live credentials and reject placeholders."""
    import pytest
    from pydantic import ValidationError

    # Test keys rejected in production
    with pytest.raises(ValidationError, match="rzp_live_"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "RAZORPAY_KEY_ID": "rzp_test_placeholder",
            }
        )

    # Placeholder secret rejected in production
    with pytest.raises(ValidationError, match="RAZORPAY_KEY_SECRET"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "RAZORPAY_KEY_SECRET": "placeholder_secret",
            }
        )

    # Missing webhook secret rejected in production
    with pytest.raises(ValidationError, match="RAZORPAY_WEBHOOK_SECRET"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "RAZORPAY_WEBHOOK_SECRET": None,
            }
        )

    # Valid live configuration passes
    prod_s = Settings(**VALID_PROD_CONFIG)
    assert prod_s.RAZORPAY_KEY_ID == "rzp_live_abcdef123456"


def test_production_hardening_validation():
    """Verifies that production environment enforces DEBUG=False, non-default JWT secret, admin key, and database URL."""
    import pytest
    from pydantic import ValidationError

    # 1. DEBUG=True must be rejected in production
    with pytest.raises(ValidationError, match="DEBUG=False"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "DEBUG": True,
            }
        )

    # 2. Known development JWT secret must be rejected in production
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "JWT_SECRET_KEY": "drape-fashion-secret-key-development-minimum-32-bytes-secure",
            }
        )

    # Short JWT secret must be rejected in production
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "JWT_SECRET_KEY": "too-short",
            }
        )

    # 3. Known default or development ADMIN_API_KEY must be rejected in production
    with pytest.raises(ValidationError, match="ADMIN_API_KEY"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "ADMIN_API_KEY": "drape-admin-dev-secret-key-32b",
            }
        )

    with pytest.raises(ValidationError, match="ADMIN_API_KEY"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "ADMIN_API_KEY": "mock_admin_key",
            }
        )

    # 4. Known default or localhost DATABASE_URL must be rejected in production
    with pytest.raises(ValidationError, match="DATABASE_URL"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "DATABASE_URL": "postgresql+asyncpg://drape_app:drape_dev_password@localhost:5432/drape_db",
            }
        )

    with pytest.raises(ValidationError, match="DATABASE_URL"):
        Settings(
            **{
                **VALID_PROD_CONFIG,
                "DATABASE_URL": "sqlite+aiosqlite:///file:prod.db",
            }
        )

    # 5. Ensure valid production settings pass cleanly
    prod_valid = Settings(**VALID_PROD_CONFIG)
    assert prod_valid.ENVIRONMENT == "production"
    assert prod_valid.DEBUG is False
    assert prod_valid.JWT_SECRET_KEY == "production-secure-unique-jwt-secret-key-32b"
    assert prod_valid.ADMIN_API_KEY == "production-admin-api-key-secure-value-32b"


def test_environment_normalization_and_casing_bypass_prevention():
    """
    Verifies that ENVIRONMENT is centrally normalized to trimmed lowercase,
    disallowing casing bypasses ('Production', 'PRODUCTION') and rejecting invalid values.
    """
    import pytest
    from pydantic import ValidationError
    from app.infrastructure.adapters.razorpay_payment_adapter import RazorpayPaymentAdapter

    # 1. Casing variants normalize to 'production'
    for variant in ("Production", "PRODUCTION", "  production  ", "  Production  "):
        s = Settings(**{**VALID_PROD_CONFIG, "ENVIRONMENT": variant})
        assert s.ENVIRONMENT == "production"

    # 2. Production hardening CANNOT be bypassed with casing variants like 'Production' or 'PRODUCTION'
    for variant in ("Production", "PRODUCTION"):
        # With DEBUG=True
        with pytest.raises(ValidationError, match="DEBUG=False"):
            Settings(**{**VALID_PROD_CONFIG, "ENVIRONMENT": variant, "DEBUG": True})

        # With dev JWT secret
        with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
            Settings(
                **{
                    **VALID_PROD_CONFIG,
                    "ENVIRONMENT": variant,
                    "JWT_SECRET_KEY": "drape-fashion-secret-key-development-minimum-32-bytes-secure",
                }
            )

        # With dev Admin key
        with pytest.raises(ValidationError, match="ADMIN_API_KEY"):
            Settings(
                **{
                    **VALID_PROD_CONFIG,
                    "ENVIRONMENT": variant,
                    "ADMIN_API_KEY": "drape-admin-dev-secret-key-32b",
                }
            )

    # 3. Other allowed environments normalize properly
    assert Settings(ENVIRONMENT="Development").ENVIRONMENT == "development"
    assert Settings(ENVIRONMENT="  TEST  ").ENVIRONMENT == "test"
    assert Settings(ENVIRONMENT="Testing").ENVIRONMENT == "testing"
    assert Settings(ENVIRONMENT="STAGING").ENVIRONMENT == "staging"

    # 4. Unknown/unrecognized environments are rejected
    for bad_env in ("invalid_env", "prod", "sandbox", "qa", ""):
        with pytest.raises(ValidationError, match="Invalid ENVIRONMENT"):
            Settings(ENVIRONMENT=bad_env)

    # 5. Razorpay adapter normalized environment property
    adapter = RazorpayPaymentAdapter()
    assert adapter.environment == "development" or adapter.environment in {
        "development",
        "test",
        "testing",
        "staging",
        "production",
    }


