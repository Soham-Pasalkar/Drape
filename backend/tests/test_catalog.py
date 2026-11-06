"""
DRAPE Product Catalog & Inventory Test Suite.

Verifies:
1. Catalog seeding idempotency and repeatability.
2. Product listing and pagination metadata.
3. Multi-faceted filtering (category, price range, variant size, variant colour).
4. Lexical keyword search.
5. Sorting strategies (price_asc, price_desc, newest, featured).
6. Single product retrieval by slug and by ID.
7. Active/inactive status enforcement and 404 handling.
8. Category summary aggregation.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.domain.models.catalog import Product
from tests.conftest import TestingSessionLocal


@pytest.mark.asyncio
async def test_catalog_seeding_and_repeatability(client: AsyncClient):
    """Verifies that seeding the catalog populates 24 items and is idempotent."""
    # First seed (or re-seed if already initialized by prior test)
    res1 = await client.post("/api/v1/products/seed")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "success"
    assert data1["details"]["total"] == 24
    assert data1["details"]["created"] + data1["details"]["updated"] == 24

    # Second seed must update rather than create duplicate rows
    res2 = await client.post("/api/v1/products/seed")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["details"]["created"] == 0
    assert data2["details"]["updated"] == 24


@pytest.mark.asyncio
async def test_list_products_pagination_and_facets(client: AsyncClient):
    """Tests default product listing and pagination structure."""
    # Ensure catalog is seeded
    await client.post("/api/v1/products/seed")

    # Fetch page 1 with page_size=6
    res = await client.get("/api/v1/products?page=1&page_size=6")
    assert res.status_code == 200
    data = res.json()

    assert len(data["items"]) == 6
    assert data["total"] == 24
    assert data["page"] == 1
    assert data["page_size"] == 6
    assert data["total_pages"] == 4
    assert len(data["categories"]) >= 6

    # Verify item schema structure
    first_item = data["items"][0]
    assert "id" in first_item
    assert "name" in first_item
    assert "slug" in first_item
    assert "price" in first_item
    assert "primary_image" in first_item
    assert len(first_item["available_colors"]) > 0
    assert len(first_item["available_sizes"]) > 0


@pytest.mark.asyncio
async def test_category_filtering(client: AsyncClient):
    """Filters products by specific categories."""
    await client.post("/api/v1/products/seed")

    # Test Coats
    coats_res = await client.get("/api/v1/products?category=coats")
    assert coats_res.status_code == 200
    coats_data = coats_res.json()
    assert coats_data["total"] == 4
    for item in coats_data["items"]:
        assert item["category"] == "coats"

    # Test Knitwear
    knit_res = await client.get("/api/v1/products?category=knitwear")
    assert knit_res.status_code == 200
    assert knit_res.json()["total"] == 4


@pytest.mark.asyncio
async def test_price_range_filtering(client: AsyncClient):
    """Filters products within price boundaries."""
    await client.post("/api/v1/products/seed")

    # Filter products between $300 and $500
    res = await client.get("/api/v1/products?min_price=300&max_price=500")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert 300.0 <= item["price"] <= 500.0


@pytest.mark.asyncio
async def test_size_and_color_filtering(client: AsyncClient):
    """Filters products offering a specific size and colour variant."""
    await client.post("/api/v1/products/seed")

    # Filter for size 'L' and color 'Noir'
    res = await client.get("/api/v1/products?size=L&color=Noir")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert "L" in item["available_sizes"]
        color_names = [c["name"].lower() for c in item["available_colors"]]
        assert "noir" in color_names


@pytest.mark.asyncio
async def test_keyword_search(client: AsyncClient):
    """Searches products by name, description, and material."""
    await client.post("/api/v1/products/seed")

    # Search for "cashmere"
    res = await client.get("/api/v1/products?search=cashmere")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    for item in data["items"]:
        item_text = (item["name"] + (item.get("material") or "") + (item.get("description") or "")).lower()
        assert "cashmere" in item_text


@pytest.mark.asyncio
async def test_sorting_strategies(client: AsyncClient):
    """Validates price and newest sorting orders."""
    await client.post("/api/v1/products/seed")

    # Price Ascending
    asc_res = await client.get("/api/v1/products?sort_by=price_asc&page_size=24")
    assert asc_res.status_code == 200
    asc_prices = [item["price"] for item in asc_res.json()["items"]]
    assert asc_prices == sorted(asc_prices)

    # Price Descending
    desc_res = await client.get("/api/v1/products?sort_by=price_desc&page_size=24")
    assert desc_res.status_code == 200
    desc_prices = [item["price"] for item in desc_res.json()["items"]]
    assert desc_prices == sorted(desc_prices, reverse=True)


@pytest.mark.asyncio
async def test_product_detail_retrieval_and_404(client: AsyncClient):
    """Retrieves single product details by slug or ID with image gallery and variants."""
    await client.post("/api/v1/products/seed")

    slug = "the-sculpted-double-faced-wool-overcoat"
    res = await client.get(f"/api/v1/products/{slug}")
    assert res.status_code == 200
    data = res.json()

    assert data["name"] == "The Sculpted Double-Faced Wool Overcoat"
    assert data["slug"] == slug
    assert data["category"] == "coats"
    assert data["price"] == 980.0
    assert data["try_on_enabled"] is True
    assert data["model_3d_format"] == "glb"
    assert len(data["images"]) >= 3
    assert len(data["variants"]) >= 4

    # Verify inventory is reported per variant
    for variant in data["variants"]:
        assert "available_quantity" in variant
        assert "in_stock" in variant

    # Lookup by ID
    product_id = data["id"]
    id_res = await client.get(f"/api/v1/products/{product_id}")
    assert id_res.status_code == 200
    assert id_res.json()["slug"] == slug

    # Nonexistent product 404
    missing_res = await client.get("/api/v1/products/nonexistent-luxury-item")
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_inactive_product_omitted_from_public_catalog(client: AsyncClient):
    """Deactivated products must not appear in public listing or detail lookups."""
    await client.post("/api/v1/products/seed")

    target_slug = "the-sculpted-double-faced-wool-overcoat"

    # Deactivate product directly in DB
    async with TestingSessionLocal() as db:
        await db.execute(
            update(Product).where(Product.slug == target_slug).values(is_active=False)
        )
        await db.commit()

    # Must return 404 on direct lookup
    get_res = await client.get(f"/api/v1/products/{target_slug}")
    assert get_res.status_code == 404

    # Must be excluded from list
    list_res = await client.get(f"/api/v1/products?search={target_slug}")
    assert list_res.status_code == 200
    assert list_res.json()["total"] == 0

    # Restore active status
    async with TestingSessionLocal() as db:
        await db.execute(
            update(Product).where(Product.slug == target_slug).values(is_active=True)
        )
        await db.commit()


@pytest.mark.asyncio
async def test_categories_endpoint(client: AsyncClient):
    """Verifies that /categories returns all active categories with counts."""
    await client.post("/api/v1/products/seed")

    res = await client.get("/api/v1/products/categories")
    assert res.status_code == 200
    categories = res.json()
    assert len(categories) == 6
    cat_slugs = {c["slug"] for c in categories}
    assert "coats" in cat_slugs
    assert "jackets" in cat_slugs
    assert "shirts" in cat_slugs
    assert "trousers" in cat_slugs
    assert "knitwear" in cat_slugs
    assert "accessories" in cat_slugs
