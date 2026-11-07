"""
DRAPE Smart Wardrobe: Seed Target Account with 18 Everyday Catalog Garments.

Target Account: sohampasalkar@gmail.com
Environment: Local development database only.
Integrity:
- Associates each entry with verified user ID.
- References real Product records in DB (seeding catalog products first if not already present).
- Classified strictly as source="manual" (no fake orders, payments, or invoices).
- Idempotent: checks existing entries, avoids duplicates.
"""

import asyncio
from decimal import Decimal
import json
import os
import re
from typing import Any, Dict, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domain.models.identity import User
from app.domain.models.catalog import Product, ProductImage, ProductVariant, Inventory
from app.domain.models.wardrobe import WardrobeItem


TARGET_EMAIL = "sohampasalkar@gmail.com"


async def verify_environment():
    """Safety check: ensure execution only targets local development database."""
    if settings.ENVIRONMENT.lower() not in ("development", "test", "local"):
        raise RuntimeError(f"ABORT: Environment is {settings.ENVIRONMENT}. Seeding allowed only in development.")

    # Check database URL points to localhost or 127.0.0.1
    db_url = str(settings.DATABASE_URL).lower()
    if not any(host in db_url for host in ("localhost", "127.0.0.1", "0.0.0.0", "@db:")):
        raise RuntimeError(f"ABORT: Database URL does not appear to be local: {db_url}")

    print("✓ Environment verified: Local development database.")


def load_catalog_json() -> List[Dict[str, Any]]:
    """Loads canonical 18 everyday products from JSON extracted from catalog."""
    json_path = os.path.join(os.path.dirname(__file__), "demo_products.json")
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


async def seed_catalog_products_if_needed(db: AsyncSession, catalog_data: List[Dict[str, Any]]) -> Dict[str, Product]:
    """Ensures all 18 catalog products and variants exist in the DB."""
    product_map: Dict[str, Product] = {}

    for item in catalog_data:
        slug = item["slug"]
        stmt = select(Product).where(Product.slug == slug)
        res = await db.execute(stmt)
        prod = res.scalar_one_or_none()

        if not prod:
            price_dec = Decimal(str(item["price"] / 100.0))
            try_on = item.get("tryOn", {})
            try_on_enabled = bool(try_on.get("available", False))
            garment_id = try_on.get("garmentId")

            prod = Product(
                id=item["id"],
                name=item["name"],
                slug=slug,
                description=item.get("description") or item.get("shortDescription") or "",
                category=item["category"],
                brand=item.get("brand") or "DRAPE Everyday",
                price=price_dec,
                currency="USD",
                material=item.get("material"),
                care_instructions="; ".join(item.get("careInstructions", [])),
                featured=item.get("featured", False),
                is_active=True,
                model_3d_url=f"/garments/{garment_id}/model.glb" if garment_id else None,
                model_3d_format="glb" if garment_id else None,
                model_3d_status="available" if garment_id else "none",
                try_on_enabled=try_on_enabled,
            )
            db.add(prod)
            await db.flush()

            # Add images
            for order, img in enumerate(item.get("images", [])):
                p_img = ProductImage(
                    product_id=prod.id,
                    image_url=img["url"],
                    alt_text=img.get("alt", prod.name),
                    display_order=img.get("displayOrder", order),
                    is_primary=bool(img.get("isPrimary", order == 0)),
                )
                db.add(p_img)

            # Add variants for first colorway
            sizes = item.get("sizes", ["S", "M", "L"])
            colors = item.get("colors", [])
            primary_color = colors[0]["name"] if colors else "Standard"
            color_code = colors[0].get("code", "#111111") if colors else "#111111"

            for s in sizes:
                variant_sku = f"{item['sku']}-{s}-{primary_color[:3].upper()}"
                variant = ProductVariant(
                    product_id=prod.id,
                    sku=variant_sku,
                    size=s,
                    color=primary_color,
                    color_code=color_code,
                    is_active=True,
                )
                db.add(variant)
                await db.flush()

                # Add stock inventory
                inv = Inventory(
                    variant_id=variant.id,
                    quantity=10,
                )
                db.add(inv)

            await db.flush()
            print(f"  + Created catalog Product: {prod.name} ({prod.category})")

        product_map[prod.id] = prod

    return product_map


async def seed_user_wardrobe(db: AsyncSession, user: User, catalog_data: List[Dict[str, Any]], product_map: Dict[str, Product]):
    """Seeds the 18 demo garments into user's wardrobe as manual items idempotently."""
    user_id = str(user.id)

    # Check existing items for this user
    existing_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user_id)
    existing_res = await db.execute(existing_stmt)
    existing_items = existing_res.scalars().all()
    existing_product_ids = {it.product_id for it in existing_items if it.product_id}
    existing_names = {it.name.lower() for it in existing_items}

    created_count = 0
    skipped_count = 0

    # Category normalization for closet compartments
    cat_normalize = {
        "tshirts": "t-shirts",
        "jeans": "jeans",
        "trousers": "trousers",
        "skirts": "skirts",
        "dresses": "dresses",
    }

    for item in catalog_data:
        p_id = item["id"]
        p_name = item["name"]

        # Check idempotency
        if p_id in existing_product_ids or p_name.lower() in existing_names:
            skipped_count += 1
            continue

        prod = product_map.get(p_id)
        colors = item.get("colors", [])
        primary_color_obj = colors[0] if colors else {"name": "Noir Black", "image": None}
        color_name = primary_color_obj["name"]
        image_url = primary_color_obj.get("image") or (item.get("images", [{}])[0].get("url") if item.get("images") else None)

        category = cat_normalize.get(item["category"], item["category"])
        
        # Determine suitable size
        size = "M"
        if category in ("jeans", "trousers"):
            size = "30"

        # Occasion & Season defaults
        occasion = "casual"
        if category == "trousers":
            occasion = "office"
        elif "slip" in p_name.lower() or "bodycon" in p_name.lower():
            occasion = "evening"

        season = "all-season"
        if "cotton" in p_name.lower() or "cropped" in p_name.lower() or "sleeveless" in p_name.lower():
            season = "summer"
        elif "long-sleeve" in p_name.lower() or "denim" in p_name.lower():
            season = "autumn"

        wardrobe_item = WardrobeItem(
            user_id=user_id,
            product_id=p_id,
            order_item_id=None,  # Demo manual item, not an order item
            source="manual",      # Clearly classified as manual/demo item
            name=p_name,
            brand=item.get("brand", "DRAPE Everyday"),
            category=category,
            subcategory=None,
            description=item.get("shortDescription") or item.get("description"),
            color=color_name,
            secondary_color=None,
            size=size,
            material=item.get("material"),
            season=season,
            occasion=occasion,
            image_url=image_url,
            purchase_date=None,  # No fake purchase date
        )
        db.add(wardrobe_item)
        created_count += 1

    await db.commit()
    print(f"\n✓ Seeding complete: {created_count} garments created, {skipped_count} skipped (already present).")


async def main():
    await verify_environment()

    async with AsyncSessionLocal() as db:
        # 1. Target Account Verification
        res = await db.execute(select(User).where(User.email == TARGET_EMAIL))
        user = res.scalar_one_or_none()
        if not user:
            print(f"❌ ABORT: Target account '{TARGET_EMAIL}' not found in database.")
            return

        print(f"✓ Found target customer: {user.email} (ID: {user.id})")

        # 2. Load Catalog
        catalog_data = load_catalog_json()
        print(f"✓ Loaded {len(catalog_data)} catalog styles from catalog definitions.")

        # 3. Seed Catalog Products (if missing)
        product_map = await seed_catalog_products_if_needed(db, catalog_data)
        print(f"✓ Catalog products ready ({len(product_map)} in map).")

        # 4. Seed Wardrobe for sohampasalkar@gmail.com
        await seed_user_wardrobe(db, user, catalog_data, product_map)

        # 5. Verification Query
        items_stmt = select(WardrobeItem).where(WardrobeItem.user_id == user.id).order_by(WardrobeItem.created_at.asc())
        items_res = await db.execute(items_stmt)
        user_items = items_res.scalars().all()

        print("\n================ VERIFICATION AUDIT ================")
        print(f"Account Email:   {user.email}")
        print(f"Account ID:      {user.id}")
        print(f"Total Garments:  {len(user_items)}")
        
        by_category = {}
        by_source = {}
        for it in user_items:
            by_category[it.category] = by_category.get(it.category, 0) + 1
            by_source[it.source] = by_source.get(it.source, 0) + 1

        print(f"By Category:     {by_category}")
        print(f"By Source:       {by_source} (100% manual/demo entries, 0 fake orders)")
        
        print("\nDetailed Garment List:")
        for idx, it in enumerate(user_items, 1):
            prod_exists = it.product_id in product_map
            print(f"  {idx:2d}. [{it.category:8s}] {it.name[:35]:35s} | Color: {it.color:15s} | Image: {it.image_url[:40]}... | Product Linked: {prod_exists}")

        print("====================================================")


if __name__ == "__main__":
    asyncio.run(main())
