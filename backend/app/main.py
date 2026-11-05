"""
DRAPE FastAPI Backend Application Entrypoint.

Initializes FastAPI with CORS middleware, RFC 9457 exception handlers,
structured logging, database connection lifecycles, and API v1 routers.
Conforms to ADR-001, ADR-002, and SYSTEM_ARCHITECTURE.md.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware.errors import setup_exception_handlers
from app.api.v1.endpoints import health
from app.api.v1.router import api_v1_router
from app.core.config import settings
from app.core.logging import logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle management."""
    setup_logging()
    logger.info(
        "DRAPE API initializing",
        extra={
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "api_prefix": settings.API_V1_STR,
        },
    )
    yield
    logger.info("DRAPE API shutting down cleanly")


def create_application() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        lifespan=lifespan,
    )

    # Configure CORS for local development and frontend access
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Register RFC 9457 exception handlers
    setup_exception_handlers(app)

    # Expose root-level health probes for container/orchestrator liveness
    app.include_router(health.router, tags=["Health & Diagnostics"])

    # Mount API v1 router
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return app


app = create_application()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )

