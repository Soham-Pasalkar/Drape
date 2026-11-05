"""
DRAPE API v1 Router Registration.

Aggregates all domain routes for the /api/v1 prefix.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import health

api_v1_router = APIRouter()

# Mount health endpoints
api_v1_router.include_router(health.router, tags=["Health & Diagnostics"])

