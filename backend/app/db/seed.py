"""
DRAPE Curated Seed Catalog Generator.

Seeds 24 realistic luxury fashion products across 6 core categories:
Coats, Jackets, Shirts, Trousers, Knitwear, and Accessories.
Includes multi-image galleries referencing existing repository assets,
SKU variants (sizes and colours), and real-time inventory records.
Idempotent: updates existing records by slug without creating duplicates.
"""

import asyncio
from decimal import Decimal
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.domain.models.catalog import Product, ProductImage, ProductVariant, Inventory


SEED_PRODUCTS: List[Dict[str, Any]] = [
    # ----------------- COATS -----------------
    {
        "name": "The Sculpted Double-Faced Wool Overcoat",
        "slug": "the-sculpted-double-faced-wool-overcoat",
        "category": "coats",
        "brand": "DRAPE Atelier",
        "price": Decimal("980.00"),
        "currency": "USD",
        "material": "100% Italian Virgin Wool (480 GSM)",
        "care_instructions": "Specialist dry clean only. Cool iron under pressing cloth. Do not tumble dry.",
        "description": "Architectural drop-shoulder silhouette cut with clean, unlined internal facings from double-faced Biella wool. Features hand-finished pick stitching, horn button closures, and a fluid drape engineered to retain structured form in motion.",
        "featured": True,
        "is_active": True,
        "model_3d_url": "/models/overcoat.glb",
        "model_3d_format": "glb",
        "model_3d_status": "available",
        "try_on_enabled": True,
        "images": [
            {"image_url": "/images/360_F_1770440943_AVX2fcHLSlqcAPX2y4TYHJAYpLx689YU.jpg", "alt_text": "Model wearing Sculpted Overcoat front silhouette", "is_primary": True, "display_order": 0},
            {"image_url": "/images/look-1-main.jpg", "alt_text": "Sculpted Overcoat full-length atelier styling", "is_primary": False, "display_order": 1},
            {"image_url": "/images/look-1-item1.jpg", "alt_text": "Double-faced wool lapel detail study", "is_primary": False, "display_order": 2},
        ],
        "variants": [
            {"size": "S", "color": "Noir", "color_code": "#111111", "sku": "DRP-COT-001-S-BLK", "quantity": 8},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-COT-001-M-BLK", "quantity": 12},
            {"size": "L", "color": "Noir", "color_code": "#111111", "sku": "DRP-COT-001-L-BLK", "quantity": 5},
            {"size": "XL", "color": "Noir", "color_code": "#111111", "sku": "DRP-COT-001-XL-BLK", "quantity": 0},
            {"size": "M", "color": "Charcoal", "color_code": "#333333", "sku": "DRP-COT-001-M-CHR", "quantity": 6},
            {"size": "L", "color": "Charcoal", "color_code": "#333333", "sku": "DRP-COT-001-L-CHR", "quantity": 4},
        ],
    },
    {
        "name": "Architectural Cashmere Wrap Coat",
        "slug": "architectural-cashmere-wrap-coat",
        "category": "coats",
        "brand": "DRAPE Atelier",
        "price": Decimal("1450.00"),
        "currency": "USD",
        "material": "90% Mongolian Cashmere, 10% Mulberry Silk",
        "care_instructions": "Dry clean only. Store on shaped wooden hanger with cedar blocks.",
        "description": "Floor-skimming wrap coat woven from dense two-ply cashmere with a luminous silk warp. Features kimono sleeves, a detachable self-fabric sash, and deep welt pockets lined in cupro.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-1.jpg", "alt_text": "Cashmere Wrap Coat editorial street perspective", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-new-season.jpg", "alt_text": "Wrap coat belt cinched atelier studio shot", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Camel", "color_code": "#C19A6B", "sku": "DRP-COT-002-S-CAM", "quantity": 4},
            {"size": "M", "color": "Camel", "color_code": "#C19A6B", "sku": "DRP-COT-002-M-CAM", "quantity": 7},
            {"size": "L", "color": "Camel", "color_code": "#C19A6B", "sku": "DRP-COT-002-L-CAM", "quantity": 3},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-COT-002-M-BLK", "quantity": 5},
        ],
    },
    {
        "name": "Cocoon Alpaca Duster Coat",
        "slug": "cocoon-alpaca-duster-coat",
        "category": "coats",
        "brand": "DRAPE Atelier",
        "price": Decimal("1120.00"),
        "currency": "USD",
        "material": "70% Suri Alpaca, 30% Virgin Wool",
        "care_instructions": "Specialist dry clean. Brush along fiber nap with natural bristle brush.",
        "description": "Generously proportioned cocoon coat crafted from long-staple Suri alpaca with an artisanal brushed texture. Soft raglan shoulders fall into a gentle taper toward the calf.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/collection-classics.jpg", "alt_text": "Cocoon Alpaca Duster in warm neutral tone", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-1.jpg", "alt_text": "Cocoon coat profile movement in Milan", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "XS", "color": "Bone", "color_code": "#E8E6DF", "sku": "DRP-COT-003-XS-BON", "quantity": 2},
            {"size": "S", "color": "Bone", "color_code": "#E8E6DF", "sku": "DRP-COT-003-S-BON", "quantity": 6},
            {"size": "M", "color": "Bone", "color_code": "#E8E6DF", "sku": "DRP-COT-003-M-BON", "quantity": 8},
        ],
    },
    {
        "name": "Minimalist Structured Car Coat",
        "slug": "minimalist-structured-car-coat",
        "category": "coats",
        "brand": "DRAPE Atelier",
        "price": Decimal("890.00"),
        "currency": "USD",
        "material": "100% Water-Resistant Storm System Wool",
        "care_instructions": "Wipe clean with damp cloth or dry clean. Do not bleach.",
        "description": "Clean concealed-placket car coat engineered from Italian weather-resistant wool. Designed with hidden horn fasteners, a high stand collar, and a boxy mid-thigh profile.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/look-2-main.jpg", "alt_text": "Minimalist Car Coat exterior look", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-2.jpg", "alt_text": "Car Coat detail with umbrella and street light", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Navy", "color_code": "#0B1D3A", "sku": "DRP-COT-004-S-NVY", "quantity": 5},
            {"size": "M", "color": "Navy", "color_code": "#0B1D3A", "sku": "DRP-COT-004-M-NVY", "quantity": 10},
            {"size": "L", "color": "Navy", "color_code": "#0B1D3A", "sku": "DRP-COT-004-L-NVY", "quantity": 4},
        ],
    },

    # ----------------- JACKETS -----------------
    {
        "name": "Raw Leather Atelier Bomber",
        "slug": "raw-leather-atelier-bomber",
        "category": "jackets",
        "brand": "DRAPE Atelier",
        "price": Decimal("1280.00"),
        "currency": "USD",
        "material": "100% Full-Grain Vegetable-Tanned Calfskin",
        "care_instructions": "Professional leather specialist clean only. Condition annually.",
        "description": "Hand-buffed raw calfskin blouson jacket accented with custom matte nickel hardware, dropped shoulders, and ribbed wool-cashmere trims. Develops a distinguished patina over seasons.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-2.jpg", "alt_text": "Raw Leather Bomber editorial perspective", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-3.jpg", "alt_text": "Leather jacket collar and texture close up", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Espresso", "color_code": "#3B2F2F", "sku": "DRP-JKT-001-S-ESP", "quantity": 3},
            {"size": "M", "color": "Espresso", "color_code": "#3B2F2F", "sku": "DRP-JKT-001-M-ESP", "quantity": 7},
            {"size": "L", "color": "Espresso", "color_code": "#3B2F2F", "sku": "DRP-JKT-001-L-ESP", "quantity": 2},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-JKT-001-M-BLK", "quantity": 5},
        ],
    },
    {
        "name": "Tailored Wool Barathea Blazer",
        "slug": "tailored-wool-barathea-blazer",
        "category": "jackets",
        "brand": "DRAPE Atelier",
        "price": Decimal("920.00"),
        "currency": "USD",
        "material": "100% English Barathea Wool (360 GSM)",
        "care_instructions": "Dry clean only. Steam gently. Do not press lapel rolls flat.",
        "description": "Double-breasted peak lapel evening blazer rendered in deep midnight barathea weave. Boasts structured roped shoulders, jetted hip pockets, and silk grosgrain covered buttons.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/young-beautiful-woman-business-suit_1303-17721.avif", "alt_text": "Double breasted barathea blazer tailored fit", "is_primary": True, "display_order": 0},
            {"image_url": "/images/look-1-item2.jpg", "alt_text": "Tailored blazer cuff and horn button detail", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Midnight Noir", "color_code": "#15151A", "sku": "DRP-JKT-002-S-MID", "quantity": 4},
            {"size": "M", "color": "Midnight Noir", "color_code": "#15151A", "sku": "DRP-JKT-002-M-MID", "quantity": 8},
            {"size": "L", "color": "Midnight Noir", "color_code": "#15151A", "sku": "DRP-JKT-002-L-MID", "quantity": 3},
        ],
    },
    {
        "name": "Beige Technical Lightweight Jacket",
        "slug": "beige-technical-lightweight-jacket",
        "category": "jackets",
        "brand": "DRAPE Atelier",
        "price": Decimal("680.00"),
        "currency": "USD",
        "material": "65% Compact Cotton, 35% Technical Polyamide",
        "care_instructions": "Machine wash delicate 30°C. Line dry in shade. Cool iron.",
        "description": "Ultra-light transitional outerwear garment cut with a generous spread collar, articulated elbows, and storm-proof bonded seams. Ideal for seasonal layering over shirts and knitwear.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/handsome-male-fashion-model-lightweight-jacket-male-dress-with-soft-beige-lifestyle-mens-men-portrait-fashion-male-background_171965-43734.avif", "alt_text": "Lightweight jacket in soft sand beige styling", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-essentials.jpg", "alt_text": "Technical jacket garment back view", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Sand", "color_code": "#E4D5B7", "sku": "DRP-JKT-003-S-SND", "quantity": 6},
            {"size": "M", "color": "Sand", "color_code": "#E4D5B7", "sku": "DRP-JKT-003-M-SND", "quantity": 11},
            {"size": "L", "color": "Sand", "color_code": "#E4D5B7", "sku": "DRP-JKT-003-L-SND", "quantity": 5},
            {"size": "XL", "color": "Sand", "color_code": "#E4D5B7", "sku": "DRP-JKT-003-XL-SND", "quantity": 2},
        ],
    },
    {
        "name": "Crimson Monochrome Suit Jacket",
        "slug": "crimson-monochrome-suit-jacket",
        "category": "jackets",
        "brand": "DRAPE Atelier",
        "price": Decimal("1150.00"),
        "currency": "USD",
        "material": "100% Tropical Virgin Wool",
        "care_instructions": "Specialist dry clean. Store in breathable canvas garment bag.",
        "description": "Sartorial statement jacket saturated in vivid Venetian crimson. Features sharp architectural lapels, half-canvas construction, and mother-of-pearl buttons.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/male-model-portrait-with-red-background-stylish-outfit_999859-18885.avif", "alt_text": "Crimson suit jacket worn by model against red studio", "is_primary": True, "display_order": 0},
            {"image_url": "/images/Mens-Fashion-Photoshoot-SHARP-Magazine-September-8-2026-7.jpg", "alt_text": "Monochrome jacket editorial motion shot", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Crimson", "color_code": "#8B1E2F", "sku": "DRP-JKT-004-S-CRM", "quantity": 2},
            {"size": "M", "color": "Crimson", "color_code": "#8B1E2F", "sku": "DRP-JKT-004-M-CRM", "quantity": 4},
            {"size": "L", "color": "Crimson", "color_code": "#8B1E2F", "sku": "DRP-JKT-004-L-CRM", "quantity": 1},
        ],
    },

    # ----------------- SHIRTS -----------------
    {
        "name": "Crisp Poplin Band-Collar Shirt",
        "slug": "crisp-poplin-band-collar-shirt",
        "category": "shirts",
        "brand": "DRAPE Atelier",
        "price": Decimal("340.00"),
        "currency": "USD",
        "material": "100% Giza 87 Extra-Long Staple Cotton (120/2 Poplin)",
        "care_instructions": "Machine wash warm 40°C. Warm iron while slightly damp. Hang dry.",
        "description": "Impeccably tailored band-collar shirt cut from silken Egyptian Giza poplin. Finished with genuine river shell buttons, french seams, and curved split side hems.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/look-1-item1.jpg", "alt_text": "Band collar cotton poplin shirt folded study", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-essentials.jpg", "alt_text": "White poplin shirt styled under tailored coat", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "XS", "color": "Optical White", "color_code": "#FAFAFA", "sku": "DRP-SHT-001-XS-WHT", "quantity": 5},
            {"size": "S", "color": "Optical White", "color_code": "#FAFAFA", "sku": "DRP-SHT-001-S-WHT", "quantity": 14},
            {"size": "M", "color": "Optical White", "color_code": "#FAFAFA", "sku": "DRP-SHT-001-M-WHT", "quantity": 18},
            {"size": "L", "color": "Optical White", "color_code": "#FAFAFA", "sku": "DRP-SHT-001-L-WHT", "quantity": 9},
            {"size": "M", "color": "Sky Blue", "color_code": "#87CEEB", "sku": "DRP-SHT-001-M-BLU", "quantity": 7},
        ],
    },
    {
        "name": "Fluid Silk Habotai Button-Down",
        "slug": "fluid-silk-habotai-button-down",
        "category": "shirts",
        "brand": "DRAPE Atelier",
        "price": Decimal("480.00"),
        "currency": "USD",
        "material": "100% Sandwashed Mulberry Silk Habotai (16mm)",
        "care_instructions": "Hand wash cold with silk detergent or dry clean. Do not wring.",
        "description": "Sensorial button-down shirt featuring a matte suede-like sandwashed finish. Designed with relaxed elongated cuffs, soft point collar, and fluid undulating drape.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/glamorous-woman-black-bodysuit-covering-her-eyes_197531-12938.avif", "alt_text": "Silk blouse draped silhouette in studio lighting", "is_primary": True, "display_order": 0},
            {"image_url": "/images/fashion-69822ecb7c423.avif", "alt_text": "Silk button down fabric texture and sheen", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Noir", "color_code": "#111111", "sku": "DRP-SHT-002-S-BLK", "quantity": 4},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-SHT-002-M-BLK", "quantity": 8},
            {"size": "L", "color": "Noir", "color_code": "#111111", "sku": "DRP-SHT-002-L-BLK", "quantity": 3},
            {"size": "M", "color": "Oyster", "color_code": "#E3DCCB", "sku": "DRP-SHT-002-M-OYS", "quantity": 5},
        ],
    },
    {
        "name": "Structured Oversized Twill Overshirt",
        "slug": "structured-oversized-twill-overshirt",
        "category": "shirts",
        "brand": "DRAPE Atelier",
        "price": Decimal("420.00"),
        "currency": "USD",
        "material": "100% Organic Heavyweight Cotton Twill (310 GSM)",
        "care_instructions": "Machine wash cold inside out. Iron medium heat. Tumble dry low.",
        "description": "Substantial utility overshirt crafted from dense organic twill. Styled with twin box-pleat chest pockets, heavy-duty horn buttons, and square bottom hem.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/pexels-photo-38347378.avif", "alt_text": "Heavy twill overshirt worn layered over tee", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-1.jpg", "alt_text": "Overshirt profile styling on urban stone terrace", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Slate Grey", "color_code": "#708090", "sku": "DRP-SHT-003-S-SLT", "quantity": 5},
            {"size": "M", "color": "Slate Grey", "color_code": "#708090", "sku": "DRP-SHT-003-M-SLT", "quantity": 10},
            {"size": "L", "color": "Slate Grey", "color_code": "#708090", "sku": "DRP-SHT-003-L-SLT", "quantity": 6},
        ],
    },
    {
        "name": "Textured Linen Camp-Collar Shirt",
        "slug": "textured-linen-camp-collar-shirt",
        "category": "shirts",
        "brand": "DRAPE Atelier",
        "price": Decimal("290.00"),
        "currency": "USD",
        "material": "100% Normandy Delave Linen (180 GSM)",
        "care_instructions": "Machine wash cold gentle cycle. Warm iron or leave naturally crinkled.",
        "description": "Airy camp-collar summer shirt woven from yarn-dyed French flax with subtle slub variations. Features seamless front placket and mother-of-pearl buttons.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/portrait-young-happy-woman-studio_1303-13802.avif", "alt_text": "Natural linen short sleeve shirt summer silhouette", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-streetwear.jpg", "alt_text": "Linen shirt lifestyle street composition", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Flax", "color_code": "#E5D9C5", "sku": "DRP-SHT-004-S-FLX", "quantity": 7},
            {"size": "M", "color": "Flax", "color_code": "#E5D9C5", "sku": "DRP-SHT-004-M-FLX", "quantity": 12},
            {"size": "L", "color": "Flax", "color_code": "#E5D9C5", "sku": "DRP-SHT-004-L-FLX", "quantity": 4},
        ],
    },

    # ----------------- TROUSERS -----------------
    {
        "name": "Wide-Leg Pleated Wool Trouser",
        "slug": "wide-leg-pleated-wool-trouser",
        "category": "trousers",
        "brand": "DRAPE Atelier",
        "price": Decimal("540.00"),
        "currency": "USD",
        "material": "100% Super 130s Wool Flannel",
        "care_instructions": "Dry clean only. Press creases with steam iron under damp cloth.",
        "description": "High-rise tailored trousers sculpted with deep double forward pleats and a relaxed pooling wide leg. Cut with side adjusters, ticket pocket, and cupro knee lining.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/look-1-item2.jpg", "alt_text": "Wide leg wool trouser pleat and waistband construction", "is_primary": True, "display_order": 0},
            {"image_url": "/images/look-1-main.jpg", "alt_text": "Trousers worn paired with double faced coat", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "XS", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-001-XS-BLK", "quantity": 3},
            {"size": "S", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-001-S-BLK", "quantity": 9},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-001-M-BLK", "quantity": 14},
            {"size": "L", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-001-L-BLK", "quantity": 7},
            {"size": "M", "color": "Charcoal", "color_code": "#383838", "sku": "DRP-TRS-001-M-CHR", "quantity": 8},
        ],
    },
    {
        "name": "Relaxed Architectural Silk Slack",
        "slug": "relaxed-architectural-silk-slack",
        "category": "trousers",
        "brand": "DRAPE Atelier",
        "price": Decimal("620.00"),
        "currency": "USD",
        "material": "60% Raw Silk Noil, 40% Virgin Wool",
        "care_instructions": "Dry clean only. Hang on felt hanger.",
        "description": "Fluid trouser cut with a subtle architectural flare towards the break. The raw silk-wool blend imparts an organic textural slub while remaining elegantly structured.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/pexels-photo-11229457.avif", "alt_text": "Silk slack silhouette with soft drape at ankle", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-2.jpg", "alt_text": "Architectural slacks in outdoor Milan spread", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Bone", "color_code": "#EAE7DF", "sku": "DRP-TRS-002-S-BON", "quantity": 4},
            {"size": "M", "color": "Bone", "color_code": "#EAE7DF", "sku": "DRP-TRS-002-M-BON", "quantity": 6},
            {"size": "L", "color": "Bone", "color_code": "#EAE7DF", "sku": "DRP-TRS-002-L-BON", "quantity": 2},
        ],
    },
    {
        "name": "Tapered Selvedge Denim Trouser",
        "slug": "tapered-selvedge-denim-trouser",
        "category": "trousers",
        "brand": "DRAPE Atelier",
        "price": Decimal("380.00"),
        "currency": "USD",
        "material": "100% 14oz Okayama Selvedge Cotton",
        "care_instructions": "Cold soak inside out with mild detergent. Hang dry. Avoid hot washes.",
        "description": "Tailored five-pocket denim crafted on vintage Toyoda shuttle looms in Kojima. High rise with a gradual taper, pink selvedge ID, and custom cast iron tack buttons.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/collection-streetwear.jpg", "alt_text": "Selvedge denim clean lines and cuff detail", "is_primary": True, "display_order": 0},
            {"image_url": "/images/wardrobe-showcase.jpg", "alt_text": "Denim trousers stacked in personal wardrobe", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Raw Indigo", "color_code": "#1A2B4C", "sku": "DRP-TRS-003-S-IND", "quantity": 8},
            {"size": "M", "color": "Raw Indigo", "color_code": "#1A2B4C", "sku": "DRP-TRS-003-M-IND", "quantity": 15},
            {"size": "L", "color": "Raw Indigo", "color_code": "#1A2B4C", "sku": "DRP-TRS-003-L-IND", "quantity": 6},
            {"size": "XL", "color": "Raw Indigo", "color_code": "#1A2B4C", "sku": "DRP-TRS-003-XL-IND", "quantity": 0},
        ],
    },
    {
        "name": "Cropped Tailored Cigarette Trouser",
        "slug": "cropped-tailored-cigarette-trouser",
        "category": "trousers",
        "brand": "DRAPE Atelier",
        "price": Decimal("460.00"),
        "currency": "USD",
        "material": "98% Wool Barathea, 2% Elastane",
        "care_instructions": "Dry clean only. Press inside out.",
        "description": "Slim, ankle-skimming cigarette trouser with permanent pressed creases and concealed ankle zip vents. Features an internal curtain waistband for clean comfort.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/young-beautiful-woman-business-suit_1303-17721.avif", "alt_text": "Cropped cigarette trousers paired with evening blazer", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-3.jpg", "alt_text": "Cigarette trouser hem and leather shoe break", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "XS", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-004-XS-BLK", "quantity": 4},
            {"size": "S", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-004-S-BLK", "quantity": 9},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-TRS-004-M-BLK", "quantity": 7},
        ],
    },

    # ----------------- KNITWEAR -----------------
    {
        "name": "Fine-Gauge Merino Turtleneck",
        "slug": "fine-gauge-merino-turtleneck",
        "category": "knitwear",
        "brand": "DRAPE Atelier",
        "price": Decimal("390.00"),
        "currency": "USD",
        "material": "100% Extrafine Australian Merino Wool (19.5 Micron, 16 Gauge)",
        "care_instructions": "Hand wash cold in wool wash. Dry flat on towel. Do not hang.",
        "description": "Silky-smooth, temperature-regulating base layer knitted fully-fashioned in Reggio Emilia. Features a firm ribbed fold-over collar, clean shoulder saddles, and ribbed cuffs.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/Mens-Fashion-Photoshoot-SHARP-Magazine-September-8-2026-7.jpg", "alt_text": "Fine gauge turtleneck worn under atelier jacket", "is_primary": True, "display_order": 0},
            {"image_url": "/images/360_F_1770440943_AVX2fcHLSlqcAPX2y4TYHJAYpLx689YU.jpg", "alt_text": "Merino wool neck fold detail", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Noir", "color_code": "#111111", "sku": "DRP-KNT-001-S-BLK", "quantity": 8},
            {"size": "M", "color": "Noir", "color_code": "#111111", "sku": "DRP-KNT-001-M-BLK", "quantity": 16},
            {"size": "L", "color": "Noir", "color_code": "#111111", "sku": "DRP-KNT-001-L-BLK", "quantity": 10},
            {"size": "M", "color": "Ecru", "color_code": "#F4F0EA", "sku": "DRP-KNT-001-M-ECR", "quantity": 7},
            {"size": "L", "color": "Ecru", "color_code": "#F4F0EA", "sku": "DRP-KNT-001-L-ECR", "quantity": 4},
        ],
    },
    {
        "name": "Seamless Cashmere Crewneck",
        "slug": "seamless-cashmere-crewneck",
        "category": "knitwear",
        "brand": "DRAPE Atelier",
        "price": Decimal("640.00"),
        "currency": "USD",
        "material": "100% Inner Mongolian Grade-A Cashmere (2-Ply, 7 Gauge)",
        "care_instructions": "Gentle hand wash cold or delicate dry clean. Store folded.",
        "description": "Seamless whole-garment 3D knit jumper eliminating uncomfortable friction seams. Soft cloud-like loft offering insulating warmth with weightless wearability.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/hero-campaign.jpg", "alt_text": "Cashmere crewneck sweater modeled in soft studio portrait", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-classics.jpg", "alt_text": "Cashmere knit texture and neckline detail", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Oatmeal", "color_code": "#D9CEBF", "sku": "DRP-KNT-002-S-OAT", "quantity": 5},
            {"size": "M", "color": "Oatmeal", "color_code": "#D9CEBF", "sku": "DRP-KNT-002-M-OAT", "quantity": 9},
            {"size": "L", "color": "Oatmeal", "color_code": "#D9CEBF", "sku": "DRP-KNT-002-L-OAT", "quantity": 3},
            {"size": "M", "color": "Charcoal", "color_code": "#2E2E2E", "sku": "DRP-KNT-002-M-CHR", "quantity": 6},
        ],
    },
    {
        "name": "Chunky Ribbed Fisherman Sweater",
        "slug": "chunky-ribbed-fisherman-sweater",
        "category": "knitwear",
        "brand": "DRAPE Atelier",
        "price": Decimal("520.00"),
        "currency": "USD",
        "material": "100% British Wool (5 Gauge Heavy Rib)",
        "care_instructions": "Hand wash cold. Do not wring or tumble dry. Dry flat away from direct heat.",
        "description": "Robust heavy-rib jumper spun from resilient British sheep wool. Heavyweight dropped shoulders with a dense English rib knit designed to block harsh maritime winds.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/stylist-campaign.jpg", "alt_text": "Chunky ribbed sweater modeled in editorial campaign", "is_primary": True, "display_order": 0},
            {"image_url": "/images/tryon-model.jpg", "alt_text": "Heavy knitwear texture and stitch precision", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Cream", "color_code": "#FFFDD0", "sku": "DRP-KNT-003-S-CRM", "quantity": 4},
            {"size": "M", "color": "Cream", "color_code": "#FFFDD0", "sku": "DRP-KNT-003-M-CRM", "quantity": 11},
            {"size": "L", "color": "Cream", "color_code": "#FFFDD0", "sku": "DRP-KNT-003-L-CRM", "quantity": 5},
        ],
    },
    {
        "name": "Brushed Mohair Open Cardigan",
        "slug": "brushed-mohair-open-cardigan",
        "category": "knitwear",
        "brand": "DRAPE Atelier",
        "price": Decimal("580.00"),
        "currency": "USD",
        "material": "67% Superkid Mohair, 30% Polyamide, 3% Wool",
        "care_instructions": "Dry clean only. Gently fluff with wide-toothed comb.",
        "description": "Hazy, ethereal open-front cardigan hand-brushed for a voluminous halo effect. Loose drapey silhouette with deep patch pockets and ribbed hems.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/pexels-photo-38798854.avif", "alt_text": "Brushed mohair cardigan soft texture on model", "is_primary": True, "display_order": 0},
            {"image_url": "/images/edit-spread-1.jpg", "alt_text": "Mohair knit layered with silk and wool", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S", "color": "Moss Green", "color_code": "#4A5D4E", "sku": "DRP-KNT-004-S-MOS", "quantity": 3},
            {"size": "M", "color": "Moss Green", "color_code": "#4A5D4E", "sku": "DRP-KNT-004-M-MOS", "quantity": 7},
            {"size": "L", "color": "Moss Green", "color_code": "#4A5D4E", "sku": "DRP-KNT-004-L-MOS", "quantity": 2},
        ],
    },

    # ----------------- ACCESSORIES -----------------
    {
        "name": "Sculptural Calfskin Atelier Tote",
        "slug": "sculptural-calfskin-atelier-tote",
        "category": "accessories",
        "brand": "DRAPE Atelier",
        "price": Decimal("1180.00"),
        "currency": "USD",
        "material": "100% Vegetable-Tanned Box Calfskin, Suede Lining",
        "care_instructions": "Wipe with soft cotton cloth. Store in dust bag with paper stuffing.",
        "description": "Minimalist architectural tote constructed with seamless origami-folded corners and painted edges. Includes internal zippered organizer pocket and magnetic closure.",
        "featured": True,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/wardrobe-showcase.jpg", "alt_text": "Leather tote resting on travertine bench", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-essentials.jpg", "alt_text": "Calfskin tote handles and edge paint precision", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "ONE SIZE", "color": "Noir", "color_code": "#111111", "sku": "DRP-ACC-001-OS-BLK", "quantity": 10},
            {"size": "ONE SIZE", "color": "Cognac", "color_code": "#9A4621", "sku": "DRP-ACC-001-OS-COG", "quantity": 6},
        ],
    },
    {
        "name": "Brushed Cashmere Blanket Scarf",
        "slug": "brushed-cashmere-blanket-scarf",
        "category": "accessories",
        "brand": "DRAPE Atelier",
        "price": Decimal("320.00"),
        "currency": "USD",
        "material": "100% Mongolian Cashmere with Natural Teasel Finish",
        "care_instructions": "Dry clean only. Comb fringe gently.",
        "description": "Substantial oversized scarf measuring 200cm x 70cm, brushed with dried teasel flowers for an iridescent ripple finish. Finished with delicate hand-twisted fringes.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/campaign-finale.jpg", "alt_text": "Cashmere blanket scarf wrapped around model shoulders", "is_primary": True, "display_order": 0},
            {"image_url": "/images/look-1-item1.jpg", "alt_text": "Cashmere fringe and ripple waterweave closeup", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "ONE SIZE", "color": "Granite", "color_code": "#595856", "sku": "DRP-ACC-002-OS-GRN", "quantity": 15},
            {"size": "ONE SIZE", "color": "Camel", "color_code": "#C19A6B", "sku": "DRP-ACC-002-OS-CAM", "quantity": 12},
        ],
    },
    {
        "name": "Polished Brass Architectural Cuff",
        "slug": "polished-brass-architectural-cuff",
        "category": "accessories",
        "brand": "DRAPE Atelier",
        "price": Decimal("260.00"),
        "currency": "USD",
        "material": "100% Solid Eco-Brass with 18k Gold Vermeil (3 Microns)",
        "care_instructions": "Store in anti-tarnish pouch. Avoid contact with perfumes and water.",
        "description": "Bold open-ended wrist cuff hand-carved with asymmetric organic facets and high-mirror polish. Engraved subtly with the DRAPE coordinates insignia.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/street-fashion-beautiful-face-graceful-woman-on-isolated-white-background-portrait-of-female-model-in-studio-lighting-to-shine-through-the-channel-plastic-surgery-and-aesthetic-cosmetology-free-photo.jpg", "alt_text": "Architectural cuff catching light on wrist", "is_primary": True, "display_order": 0},
            {"image_url": "/images/images.jpeg", "alt_text": "Polished brass jewellery piece still life", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "S/M", "color": "Gold", "color_code": "#D4AF37", "sku": "DRP-ACC-003-SM-GLD", "quantity": 8},
            {"size": "M/L", "color": "Gold", "color_code": "#D4AF37", "sku": "DRP-ACC-003-ML-GLD", "quantity": 5},
            {"size": "S/M", "color": "Silver", "color_code": "#C0C0C0", "sku": "DRP-ACC-003-SM-SLV", "quantity": 7},
        ],
    },
    {
        "name": "Minimalist Matte Leather Belt",
        "slug": "minimalist-matte-leather-belt",
        "category": "accessories",
        "brand": "DRAPE Atelier",
        "price": Decimal("210.00"),
        "currency": "USD",
        "material": "100% Full-Grain English Bridle Leather (32mm width)",
        "care_instructions": "Condition leather with saddle balm as needed.",
        "description": "Sleek waist belt featuring a concealed stud buckle closure and beveled wax-finished edges. Designed to seamlessly cinch trousers, overcoats, and blazers alike.",
        "featured": False,
        "is_active": True,
        "try_on_enabled": False,
        "images": [
            {"image_url": "/images/look-1-item2.jpg", "alt_text": "Minimalist matte black leather belt cinched on trouser", "is_primary": True, "display_order": 0},
            {"image_url": "/images/collection-classics.jpg", "alt_text": "Bridle leather buckle mechanism and edge finish", "is_primary": False, "display_order": 1},
        ],
        "variants": [
            {"size": "80", "color": "Noir", "color_code": "#111111", "sku": "DRP-ACC-004-80-BLK", "quantity": 6},
            {"size": "85", "color": "Noir", "color_code": "#111111", "sku": "DRP-ACC-004-85-BLK", "quantity": 10},
            {"size": "90", "color": "Noir", "color_code": "#111111", "sku": "DRP-ACC-004-90-BLK", "quantity": 8},
            {"size": "95", "color": "Noir", "color_code": "#111111", "sku": "DRP-ACC-004-95-BLK", "quantity": 4},
        ],
    },
]


async def seed_catalog(
    db: AsyncSession,
    replenish_existing_inventory: Optional[bool] = None,
) -> Dict[str, int]:
    """
    Idempotently seeds products, images, variants, and inventory into the database.
    In production environments, existing inventory is preserved and never overwritten
    unless explicitly requested. In non-production environments, stock is replenished.
    Returns counts of created and updated items.
    """
    if replenish_existing_inventory is None:
        replenish_existing_inventory = settings.ENVIRONMENT.lower() != "production"

    created_count = 0
    updated_count = 0

    for item_data in SEED_PRODUCTS:
        slug = item_data["slug"]
        stmt = select(Product).where(Product.slug == slug)
        result = await db.execute(stmt)
        existing_product = result.scalar_one_or_none()

        if existing_product is None:
            # Create new product
            product = Product(
                name=item_data["name"],
                slug=slug,
                category=item_data["category"],
                brand=item_data["brand"],
                price=item_data["price"],
                currency=item_data["currency"],
                material=item_data.get("material"),
                care_instructions=item_data.get("care_instructions"),
                description=item_data["description"],
                featured=item_data.get("featured", False),
                is_active=item_data.get("is_active", True),
                model_3d_url=item_data.get("model_3d_url"),
                model_3d_format=item_data.get("model_3d_format"),
                model_3d_status=item_data.get("model_3d_status", "pending"),
                try_on_enabled=item_data.get("try_on_enabled", False),
            )
            db.add(product)
            await db.flush()  # populate product.id

            # Add images
            for img_info in item_data["images"]:
                image = ProductImage(
                    product_id=product.id,
                    image_url=img_info["image_url"],
                    alt_text=img_info.get("alt_text"),
                    display_order=img_info.get("display_order", 0),
                    is_primary=img_info.get("is_primary", False),
                )
                db.add(image)

            # Add variants & inventory
            for var_info in item_data["variants"]:
                variant = ProductVariant(
                    product_id=product.id,
                    sku=var_info["sku"],
                    size=var_info["size"],
                    color=var_info["color"],
                    color_code=var_info.get("color_code"),
                    is_active=True,
                )
                db.add(variant)
                await db.flush()  # populate variant.id

                inv = Inventory(
                    variant_id=variant.id,
                    quantity=var_info.get("quantity", 0),
                )
                db.add(inv)

            created_count += 1
        else:
            # Update core product fields to ensure current values
            existing_product.name = item_data["name"]
            existing_product.category = item_data["category"]
            existing_product.price = item_data["price"]
            existing_product.description = item_data["description"]
            existing_product.material = item_data.get("material")
            existing_product.care_instructions = item_data.get("care_instructions")
            existing_product.featured = item_data.get("featured", False)
            existing_product.is_active = item_data.get("is_active", True)
            existing_product.try_on_enabled = item_data.get("try_on_enabled", False)

            # Replenish inventory for existing variants to ensure fresh seed stock
            for var_info in item_data["variants"]:
                var_stmt = select(ProductVariant).where(
                    ProductVariant.product_id == existing_product.id,
                    ProductVariant.sku == var_info["sku"],
                )
                var_res = await db.execute(var_stmt)
                variant = var_res.scalar_one_or_none()
                if variant:
                    inv_stmt = select(Inventory).where(Inventory.variant_id == variant.id)
                    inv_res = await db.execute(inv_stmt)
                    inv = inv_res.scalar_one_or_none()
                    if inv:
                        if replenish_existing_inventory:
                            inv.quantity = var_info.get("quantity", 0)
                    else:
                        db.add(Inventory(variant_id=variant.id, quantity=var_info.get("quantity", 0)))
            updated_count += 1

    await db.commit()
    return {"created": created_count, "updated": updated_count, "total": len(SEED_PRODUCTS)}


async def main():
    """CLI runner for direct database seeding."""
    async with AsyncSessionLocal() as session:
        result = await seed_catalog(session)
        print(f"Catalog seed complete: {result['created']} created, {result['updated']} updated, {result['total']} total items.")


if __name__ == "__main__":
    asyncio.run(main())

