"""Tests for health and readiness probes."""

import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_healthz_endpoint(client):
    """Liveness probe must return 200 and healthy status."""
    response = await client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "drape-backend"
    assert "version" in data
    assert "timestamp" in data

    # Verify identical behavior at API v1 route
    v1_response = await client.get("/api/v1/healthz")
    assert v1_response.status_code == 200
    assert v1_response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_readyz_endpoint_database_connected(client):
    """Readiness probe must return 200 when database check succeeds."""
    with patch(
        "app.api.v1.endpoints.health.check_database_connection",
        return_value=True,
    ):
        response = await client.get("/readyz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["checks"]["database"] == "connected"


@pytest.mark.asyncio
async def test_readyz_endpoint_database_disconnected(client):
    """Readiness probe must return 503 when database is unreachable."""
    with patch(
        "app.api.v1.endpoints.health.check_database_connection",
        return_value=False,
    ):
        response = await client.get("/readyz")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["checks"]["database"] == "disconnected"

