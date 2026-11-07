"""
DRAPE API v1 Router Registration.

Aggregates all domain routes for the /api/v1 prefix.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    addresses,
    auth,
    cart,
    checkout,
    health,
    orders,
    payments,
    products,
    users,
    wardrobe,
)

api_v1_router = APIRouter()

# Mount health endpoints
api_v1_router.include_router(health.router, tags=["Health & Diagnostics"])

# Mount customer authentication endpoints (/api/v1/auth)
api_v1_router.include_router(auth.router)

# Mount customer profile and consent endpoints (/api/v1/users)
api_v1_router.include_router(users.router)

# Mount customer address management endpoints (/api/v1/addresses)
api_v1_router.include_router(addresses.router)

# Mount product catalog endpoints (/api/v1/products)
api_v1_router.include_router(products.router)

# Mount shopping cart endpoints (/api/v1/cart)
api_v1_router.include_router(cart.router)

# Mount checkout endpoints (/api/v1/checkout)
api_v1_router.include_router(checkout.router)

# Mount payment endpoints (/api/v1/payments)
api_v1_router.include_router(payments.router)

# Mount order endpoints (/api/v1/orders)
api_v1_router.include_router(orders.router)

# Mount digital wardrobe and outfits endpoints (/api/v1/wardrobe)
api_v1_router.include_router(wardrobe.router)

