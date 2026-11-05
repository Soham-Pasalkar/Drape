"""
DRAPE Health & Liveness Probes.

Provides liveness and readiness endpoints conforming to
SYSTEM_ARCHITECTURE.md §8.2.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, Response, status

from app.core.config import settings
from app.core.database import check_database_connection

router = APIRouter()


@router.get(
    "/healthz",
    summary="Service Liveness Probe",
    description="Returns HTTP 200 if the ASGI server and event loop are healthy and responding.",
    status_code=status.HTTP_200_OK,
)
async def healthz() -> Dict[str, Any]:
    """
    Liveness probe.
    
    Validates purely that the application process is running and can process
    requests. Does NOT query the database, ensuring liveness is separated
    from external dependency states.
    """
    return {
        "status": "healthy",
        "service": "drape-backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get(
    "/readyz",
    summary="Service Readiness Probe",
    description="Validates active connectivity to dependent backing stores (PostgreSQL).",
)
async def readyz(response: Response) -> Dict[str, Any]:
    """
    Readiness probe.
    
    Verifies that the backend can successfully query PostgreSQL.
    Returns HTTP 200 if ready to receive customer traffic;
    returns HTTP 503 if the database is unreachable.
    """
    db_connected = await check_database_connection()

    payload: Dict[str, Any] = {
        "status": "ready" if db_connected else "unhealthy",
        "service": "drape-backend",
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {
            "database": "connected" if db_connected else "disconnected",
        },
    }

    if not db_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return payload

