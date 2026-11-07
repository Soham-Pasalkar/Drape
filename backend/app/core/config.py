"""
DRAPE Core Configuration Module.

Loads configuration from environment variables with fallback defaults.
Conforms to ADR-001 and SYSTEM_ARCHITECTURE.md principles.
"""

from typing import Any, List, Optional, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DRAPE API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def normalize_environment(cls, v: Union[str, Any]) -> str:
        if isinstance(v, str):
            v_norm = v.strip().lower()
            allowed = {"development", "test", "testing", "staging", "production"}
            if v_norm not in allowed:
                raise ValueError(
                    f"Invalid ENVIRONMENT '{v}'. Must be one of: {', '.join(sorted(allowed))}."
                )
            return v_norm
        return v

    # Server binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS origins allowed to access the API
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins: List[str]
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            origins = [str(i) for i in v]
        elif isinstance(v, str):
            origins = [v]
        else:
            raise ValueError(v)

        if "*" in origins:
            raise ValueError(
                "Wildcard CORS origin '*' is prohibited when credentials are enabled."
            )
        return origins

    # Database connection parameters (PostgreSQL asyncpg driver)
    DATABASE_URL: str = (
        "postgresql+asyncpg://drape_app:drape_dev_password@localhost:5432/drape_db"
    )
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30

    # Administrative & Operations Security Settings
    ADMIN_API_KEY: Optional[str] = "drape-admin-dev-secret-key-32b"

    # Authentication & JWT Security Settings
    JWT_SECRET_KEY: str = (
        "drape-fashion-secret-key-development-minimum-32-bytes-secure"
    )
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: Optional[str] = "drape-auth"
    JWT_AUDIENCE: Optional[str] = "drape-client"
    JWT_LEEWAY_SECONDS: int = 10
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Razorpay Payment Gateway Settings
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None
    PAYMENT_PROVIDER: str = "razorpay"

    # Commerce, Shipping & Tax Defaults
    DEFAULT_TAX_RATE: float = 0.0825
    FREE_SHIPPING_THRESHOLD: float = 500.00
    PENDING_ORDER_EXPIRATION_MINUTES: int = 30

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    @model_validator(mode="after")
    def validate_production_config(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            # 1. Enforce DEBUG=False in production
            if self.DEBUG is not False:
                raise ValueError("Production environment strictly requires DEBUG=False.")

            # 2. Reject known development JWT secret in production
            dev_jwt_secret = "drape-fashion-secret-key-development-minimum-32-bytes-secure"
            if (
                not self.JWT_SECRET_KEY
                or self.JWT_SECRET_KEY == dev_jwt_secret
                or "development" in self.JWT_SECRET_KEY.lower()
                or len(self.JWT_SECRET_KEY) < 32
            ):
                raise ValueError(
                    "Production environment strictly prohibits using the development or insecure JWT_SECRET_KEY. "
                    "A secure, unique key of at least 32 characters is required."
                )

            # 3. Require explicitly configured, non-default ADMIN_API_KEY in production
            dev_admin_key = "drape-admin-dev-secret-key-32b"
            if (
                not self.ADMIN_API_KEY
                or self.ADMIN_API_KEY == dev_admin_key
                or any(self.ADMIN_API_KEY.lower().startswith(p) for p in ("placeholder", "mock_", "dev_"))
                or "dev" in self.ADMIN_API_KEY.lower()
            ):
                raise ValueError(
                    "Production environment requires an explicitly configured, non-default ADMIN_API_KEY."
                )

            # 4. Require explicitly configured production DATABASE_URL
            dev_db_url = "postgresql+asyncpg://drape_app:drape_dev_password@localhost:5432/drape_db"
            if (
                not self.DATABASE_URL
                or self.DATABASE_URL == dev_db_url
                or "localhost" in self.DATABASE_URL.lower()
                or "127.0.0.1" in self.DATABASE_URL
                or "drape_dev_password" in self.DATABASE_URL
                or self.DATABASE_URL.startswith("sqlite")
            ):
                raise ValueError(
                    "Production environment requires an explicitly configured production DATABASE_URL "
                    "without development credentials or localhost hostnames."
                )

            # 5. Production payment gateway configuration
            if self.PAYMENT_PROVIDER == "razorpay":
                if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_ID.startswith("rzp_live_"):
                    raise ValueError(
                        "Production environment strictly requires RAZORPAY_KEY_ID starting with 'rzp_live_'."
                    )
                if not self.RAZORPAY_KEY_SECRET or any(
                    self.RAZORPAY_KEY_SECRET.startswith(p) for p in ("placeholder", "test_", "mock_")
                ):
                    raise ValueError(
                        "Production environment strictly requires a valid RAZORPAY_KEY_SECRET."
                    )
                if not self.RAZORPAY_WEBHOOK_SECRET or any(
                    self.RAZORPAY_WEBHOOK_SECRET.startswith(p) for p in ("placeholder", "test_", "mock_")
                ):
                    raise ValueError(
                        "Production environment strictly requires a valid RAZORPAY_WEBHOOK_SECRET."
                    )
        return self


settings = Settings()

