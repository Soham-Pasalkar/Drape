"""Tests for RFC 9457 Problem Details error formatting."""

import pytest


@pytest.mark.asyncio
async def test_404_not_found_problem_details(client):
    """404 responses must conform to RFC 9457 format."""
    response = await client.get("/non-existent-route")
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    data = response.json()
    assert "type" in data
    assert "title" in data
    assert data["status"] == 404
    assert data["instance"] == "/non-existent-route"

