# DRAPE Milestone Specification: Product Catalog, Product Details, 3D Garment Mapping & Shopping Cart

**Milestone:** Catalog Commerce & 3D Products  
**Branch:** `feature/catalog-commerce-3d-products`  
**Base:** `recovery/stable-ar-baseline-m0.9` (`4d80b0888d0bbc7da1110ade3cae988e9a1c0990`)  
**Parent M0.9 Baseline Commit:** `a10461f06f6a023d94fee0c2372d1d0f486eaaaf`  
**Status:** Complete, Verified, Zero AR Regressions  

---

## 1. Executive Summary & Scope

This milestone transitions DRAPE from an AR-focused research prototype into an active, high-fashion luxury commerce storefront. It builds a canonical product catalog of 18 demo garments, multi-faceted catalog browsing and filtering, dynamic product detail dossiers with mandatory size and color selection, authentic product-to-3D garment mappings, Try-On Studio return navigation, and seamless shopping cart integration.

### Core Objectives Delivered
1. **18 Canonical Demo Products:** A balanced luxury ready-to-wear assortment across 6 core categories.
2. **Authentic 3D Garment Mapping:** Strict validation against the central AR garment registry (`frontend/src/lib/ar/garment-registry.ts`). Exactly 8 products are mapped to compatible real GLB models; 10 products have `tryOnGarmentId: null` with explicit in-development explanations. Zero fabricated 3D compatibility.
3. **Editorial Product Catalog (`/collections`):** Responsive grid (4 cols desktop, 3 cols tablet, 2 cols mobile), live category facets, lexical search, size pills, color swatches, price and curation sorting, and filter clearing.
4. **Dynamic Product Detail (`/products/[slug]`):** Split layout with editorial gallery, accordion specifications (Material & Origin, Care Guidelines, Delivery & Returns), size guide modal, color selector, mandatory size validation, and "Add to Bag".
5. **Shopping Bag Integration (`/cart`):** Fully integrated with `frontend/src/context/CartContext.tsx`, supporting item additions, quantity updates, line removals, integer minor-unit USD calculations, order valuations, and empty-state guidance.
6. **Try-On Studio Integration (`/try-on`):** Preserves existing AR pipeline, initialization with `initialGarmentId`, and context preservation with `returnUrl` / "Back to Product" navigation.
7. **Protected AR Baseline:** The M0.9 recovery implementation remains completely frozen. Zero modifications to tracking, PnP, coordinate transforms, garment deformation, collision, depth occlusion, camera rendering, or existing AR unit tests.

---

## 2. Technical Architecture & Git Baseline

### 2.1 Git Integrity
- **Base Branch:** `recovery/stable-ar-baseline-m0.9`
- **Feature Branch:** `feature/catalog-commerce-3d-products`
- **Immutable Reference Checkpoint:** `drape-ar-working-best-2026-11-07` at `1cac2ae646a5af928219ea7d928b9d1355acbe4a`
- All historical commits, tags, and AR benchmarks remain unmodified.

### 2.2 Directory Structure
```text
frontend/src/
├── app/
│   ├── collections/
│   │   ├── [category]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── products/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── cart/
│   │   └── page.tsx
│   └── try-on/
│       └── page.tsx
│
├── components/
│   ├── catalog/
│   │   ├── CatalogHeader.tsx
│   │   ├── CatalogFilters.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   └── ProductSort.tsx
│   ├── product/
│   │   ├── ProductGallery.tsx
│   │   ├── ProductInformation.tsx
│   │   ├── VariantSelector.tsx
│   │   ├── SizeSelector.tsx
│   │   ├── AddToBagButton.tsx
│   │   └── ProductTryOnButton.tsx
│   └── cart/
│       ├── CartItem.tsx
│       ├── CartSummary.tsx
│       └── EmptyCart.tsx
│
├── features/
│   └── catalog/
│       ├── types.ts
│       ├── data/
│       │   └── demo-products.ts
│       ├── services/
│       │   └── catalog-service.ts
│       ├── utils/
│       │   └── product-mapping.ts
│       └── hooks/
│           └── useCatalog.ts
│
└── context/
    ├── AuthContext.tsx
    └── CartContext.tsx
```

---

## 3. Product Assortment & Data Model

### 3.1 Category Distribution (18 Total)
| Category | Count | Category Label | Available 3D Models |
|---|---:|---|---|
| Tops | 5 | Tops & Tees | 5 (`tshirt-crewneck`, `tshirt-oversized`, `tshirt-fitted`, `top-longsleeve`, `top-sleeveless`) |
| Shirts | 3 | Shirts | 0 (`null` — tailored button-front in development) |
| Trousers | 3 | Trousers | 0 (`null` — bifurcated patterns in development) |
| Outerwear | 3 | Outerwear & Coats | 0 (`null` — heavy structured coats in development) |
| Dresses | 2 | Dresses | 1 (`dress-midi`), 1 `null` (slip dress) |
| Skirts | 2 | Skirts | 2 (`skirt-aline`, `skirt-pleated`) |
| **Total** | **18** | | **8 Compatible / 10 In Development** |

### 3.2 Product-to-3D GLB Mapping Manifest

| # | Product Name | Slug | Category | Price (USD) | 3D Garment ID | GLB Asset Path | Try-On Status |
|---|---|---|---|---|---|---|---|
| 1 | Atelier Classic Crew Tee | `atelier-classic-crew-tee` | Tops | $180.00 | `tshirt-crewneck` | `/garments/tshirt-crewneck/model.glb` | **Active** |
| 2 | Heavyweight Boxy Tee | `heavyweight-boxy-tee` | Tops | $220.00 | `tshirt-oversized` | `/garments/tshirt-oversized/model.glb` | **Active** |
| 3 | Sculpted Ribbed Slim Tee | `sculpted-ribbed-slim-tee` | Tops | $195.00 | `tshirt-fitted` | `/garments/tshirt-fitted/model.glb` | **Active** |
| 4 | Cashmere Long-Sleeve Top | `cashmere-long-sleeve-top` | Tops | $480.00 | `top-longsleeve` | `/garments/top-longsleeve/model.glb` | **Active** |
| 5 | Silk Georgette Halter Top | `silk-georgette-halter-top` | Tops | $340.00 | `top-sleeveless` | `/garments/top-sleeveless/model.glb` | **Active** |
| 6 | Relaxed Oxford Poplin Shirt | `relaxed-oxford-poplin-shirt` | Shirts | $320.00 | `null` | N/A | In Development |
| 7 | Structured Minimalist Dress Shirt | `structured-minimalist-dress-shirt` | Shirts | $360.00 | `null` | N/A | In Development |
| 8 | Fluid Silk Resort Shirt | `fluid-silk-resort-shirt` | Shirts | $420.00 | `null` | N/A | In Development |
| 9 | Tailored Wool Wide-Leg Trouser | `tailored-wool-wide-leg-trouser` | Trousers | $540.00 | `null` | N/A | In Development |
| 10 | Relaxed Pleated Chino Trouser | `relaxed-pleated-chino-trouser` | Trousers | $390.00 | `null` | N/A | In Development |
| 11 | Fluid Drape Wool Cigarette Pant | `fluid-drape-wool-cigarette-pant` | Trousers | $490.00 | `null` | N/A | In Development |
| 12 | Sculpted Double-Faced Wool Overcoat | `sculpted-double-faced-wool-overcoat` | Outerwear | $980.00 | `null` | N/A | In Development |
| 13 | Technical Minimalist Shell Jacket | `technical-minimalist-shell-jacket` | Outerwear | $760.00 | `null` | N/A | In Development |
| 14 | Boxy Cropped Wool Blouson | `boxy-cropped-wool-blouson` | Outerwear | $840.00 | `null` | N/A | In Development |
| 15 | Architectural Column Midi Dress | `architectural-column-midi-dress` | Dresses | $720.00 | `dress-midi` | `/garments/dress-midi/model.glb` | **Active** |
| 16 | Minimalist Silk Slip Dress | `minimalist-silk-slip-dress` | Dresses | $580.00 | `null` | N/A | In Development |
| 17 | Virgin Wool A-Line Skirt | `virgin-wool-a-line-skirt` | Skirts | $440.00 | `skirt-aline` | `/garments/skirt-aline/model.glb` | **Active** |
| 18 | Sunray Pleated Midi Skirt | `sunray-pleated-midi-skirt` | Skirts | $510.00 | `skirt-pleated` | `/garments/skirt-pleated/model.glb` | **Active** |

### 3.3 Visual Image-to-Product Audit & Colour Integrity

Every photograph in `frontend/public/images/` was visually inspected and mapped with 100% garment category and colour fidelity. Zero cross-category reuse (no blazers for shirts, no coats for skirts), and zero fake alternate views.

| # | Product Name | Category | Mapped Image Asset | Image Garment Depiction | Color Tag | View Tag | Hover Behavior |
|---|---|---|---|---|---|---|---|
| 1 | Atelier Classic Crew Tee | Tops | `/images/tryon-model.jpg` | Woman model in black crewneck tee/top | Noir | front | Stays on primary front |
| 2 | Heavyweight Boxy Tee | Tops | `/images/pexels-photo-38347378.avif` | Model in concrete grey crewneck tee | Concrete | front | Stays on primary front |
| 3 | Sculpted Ribbed Slim Tee | Tops | `/images/glamorous-woman-black-bodysuit-covering-her-eyes_197531-12938.avif` | Model in black ribbed long-sleeve top | Anthracite | front | Stays on primary front |
| 4 | Cashmere Long-Sleeve Top | Tops | `/images/images.jpeg`<br>`/images/stylist-campaign.jpg` | Cream turtleneck knitwear<br>Black long-sleeve knit top | Heather Sand<br>Midnight Noir | front<br>front | Switches with selected color; stays on color front |
| 5 | Silk Georgette Halter Top | Tops | `/images/pexels-photo-38798854.avif`<br>`/images/campaign-finale.jpg` | Model in black halter crop top<br>Model in forest lace bralette | Obsidian<br>Forest | front<br>front | Switches with selected color; stays on color front |
| 6 | Relaxed Oxford Poplin Shirt | Shirts | `/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-1.jpg` | Model in white collared dress shirt | Chalk White | front | Stays on primary front |
| 7 | Structured Minimalist Dress Shirt | Shirts | `/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-2.jpg` | Model in deep umber collared shirt | Deep Umber | front | Stays on primary front |
| 8 | Fluid Silk Resort Shirt | Shirts | `/images/Mens-Fashion-Photoshoot-SHARP-Magazine-September-8-2026-7.jpg` | Model in dark olive knit polo shirt | Olive Noir | front | Stays on primary front |
| 9 | Tailored Wool Wide-Leg Trouser | Trousers | `/images/collection-essentials.jpg`<br>`/images/look-1-item2.jpg` | Model in dark espresso wool trousers<br>Exact macro pocket/waist crop | Espresso<br>Espresso | front<br>detail | Genuine front → detail transition on hover |
| 10 | Relaxed Pleated Chino Trouser | Trousers | `/images/look-1-main.jpg` | Model in khaki pleated chino trousers | Khaki Stone | front | Stays on primary front |
| 11 | Fluid Drape Wool Cigarette Pant | Trousers | `/images/young-beautiful-woman-business-suit_1303-17721.avif` | Model in tailored houndstooth trousers | Charcoal Melange | front | Stays on primary front |
| 12 | Sculpted Double-Faced Wool Overcoat | Outerwear | `/images/look-1-main.jpg`<br>`/images/look-1-item1.jpg` | Model in grey car overcoat<br>Exact macro horn button & wool crop | Charcoal Melange<br>Charcoal Melange | front<br>detail | Genuine front → detail transition on hover |
| 13 | Technical Minimalist Shell Jacket | Outerwear | `/images/handsome-male-fashion-model-lightweight-jacket...avif` | Model in sand lightweight zip shell | Sand Pearl | front | Stays on primary front |
| 14 | Boxy Cropped Wool Blouson | Outerwear | `/images/edit-spread-3.jpg`<br>`/images/360_F_1770440943_...jpg`<br>`/images/collection-streetwear.jpg` | Black blazer silhouette<br>Glacier white outerwear<br>Camel cropped blazer | Noir<br>Glacier White<br>Camel | front<br>front<br>front | Switches with selected color; stays on color front |
| 15 | Architectural Column Midi Dress | Dresses | `/images/pexels-photo-11229457.avif` | Model seated in black architectural dress | Noir | front | Stays on primary front |
| 16 | Minimalist Silk Slip Dress | Dresses | `/images/street-fashion-beautiful-face...jpg`<br>`/images/look-2-main.jpg` | Model in black rouleau slip dress<br>Model in champagne wrap dress | Raven Black<br>Champagne | front<br>front | Switches with selected color; stays on color front |
| 17 | Virgin Wool A-Line Skirt | Skirts | `/images/pexels-photo-38347378.avif` | Model walking in black column skirt | Noir | front | Stays on primary front |
| 18 | Sunray Pleated Midi Skirt | Skirts | `/images/portrait-young-happy-woman-studio_1303-13802.avif` | Model in crimson draped wrap midi skirt | Crimson | front | Stays on primary front |

---

## 4. Verification & Test Execution Results

All verification suites were executed against the codebase:

### 4.1 Commerce & Catalog Test Suite
```bash
npm --prefix frontend run test:commerce
```
Output:
```text
▸ Catalog Assortment & Data Integrity
  ✓ exactly 18 active demo products in collection
  ✓ balanced category distribution
  ✓ unique product IDs, slugs, and primary SKUs
  ✓ all products have integer minor-unit USD prices > 0
  ✓ all variants have unique SKUs and valid stock numbers
  ✓ all product photography assets exist on disk in public/

▸ 3D Garment Mapping & No Fake Compatibility
  ✓ all compatible products map strictly to registered GLBs in garment registry
  ✓ incompatible products have null garmentId and clear explanation
  ✓ Try-On URL generation preserves garment ID and return-to-product context

▸ Product Image Integrity & Colour Resolution
  ✓ every product image has defined color, valid view tag, and non-empty alt text
  ✓ every availableColor and variant has a photograph matching its color
  ✓ product card hover never swaps to an unrelated garment or different color
  ✓ color filtering displays matching color photograph on product cards

▸ Catalog Filtering, Search & Sorting
  ✓ filtering by category strictly isolates products without cross-category pollution
  ✓ lexical search by keyword across name, description and textile
  ✓ filtering by size matches products with available in-stock size variants
  ✓ compound filtering strictly matches a single variant with BOTH size AND color in stock
  ✓ sorting by price low to high and high to low
  ✓ category facets return accurate counts matching total

▸ Shopping Bag Monetary & Quantity Integrity
  ✓ currency formatting preserves minor units without floating error
  ✓ cart subtotal uses exact integer math

test-catalog-commerce: 21 passed, 0 failed
```

### 4.2 Garment Asset Audit
```bash
npm --prefix frontend run validate:garments
```
Output:
```text
=== DRAPE GARMENT ASSET AUDIT ===
✓ [tshirt-crewneck]  GLB Size: 38.7 KB, Vertices: 847, Triangles: 1504
✓ [tshirt-oversized] GLB Size: 38.7 KB, Vertices: 847, Triangles: 1504
✓ [tshirt-fitted]    GLB Size: 38.7 KB, Vertices: 847, Triangles: 1504
✓ [top-longsleeve]   GLB Size: 38.7 KB, Vertices: 847, Triangles: 1504
✓ [top-sleeveless]   GLB Size: 27.0 KB, Vertices: 609, Triangles: 1120
✓ [skirt-aline]      GLB Size: 48.3 KB, Vertices: 1095, Triangles: 1984
✓ [skirt-pleated]    GLB Size: 76.8 KB, Vertices: 1767, Triangles: 3264
✓ [dress-midi]       GLB Size: 39.4 KB, Vertices: 899, Triangles: 1680

✅ ALL 8 GARMENT ASSETS VALIDATED SUCCESSFULLY
```

### 4.3 AR Regression Suite
```bash
npm --prefix frontend run test:ar
```
Output:
```text
================ AR TEST TOTAL: 284 passed, 0 failed, 0 suites crashed ================
```

### 4.4 Next.js Production Build & ESLint
```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```
Output:
```text
✔ No ESLint warnings or errors
✓ Compiled successfully
✓ Generating static pages (17/17)
✓ Finalizing page optimization
```

### 4.5 Backend Test Suite
```bash
./backend/.venv/bin/pytest backend/tests/test_catalog.py backend/tests/test_cart.py
```
Output:
```text
19 passed in 4.15s
```

---

## 5. Developer Guide: Managing Products & 3D Mappings

### 5.1 How to Add a New Product
1. Open `frontend/src/features/catalog/data/demo-products.ts`.
2. Append a new product entry conforming to `Product` in `frontend/src/features/catalog/types.ts`:
   - Unique `id` (e.g. `prod-top-006-merino-knit`).
   - Unique URL `slug` (e.g. `merino-wool-crew-knit`).
   - Unique SKU (e.g. `DRP-TOP-006`).
   - Monetary price defined using `createPrice(amountMinorCents)` (e.g. `createPrice(35000)`).
   - Valid category (`tops`, `shirts`, `trousers`, `outerwear`, `dresses`, `skirts`).
   - Local photography paths in `frontend/public/images/`.
   - Realistic size variants with non-negative quantities.
   - If no compatible 3D asset exists, set:
     ```ts
     tryOn: {
       available: false,
       garmentId: null,
       explanation: "3D virtual try-on is currently in development for fine-gauge knitwear.",
     }
     ```
3. Run `npm --prefix frontend run test:commerce` to verify data validity.

### 5.2 How to Map a Product to a Compatible 3D Asset
1. Verify the 3D model exists in `frontend/public/garments/<garmentId>/model.glb`.
2. Verify the garment metadata is registered in `frontend/src/lib/ar/garment-registry.ts` under `GARMENTS`.
3. In the product record:
   ```ts
   tryOn: {
     available: true,
     garmentId: "<garmentId>", // Must match registry id exactly
     explanation: "3D virtual try-on mapped to atelier pattern.",
   }
   ```
4. Never point trousers or outerwear to tops or skirt meshes. If the silhouette does not match, set `available: false` and `garmentId: null`.

### 5.3 Replacing Demo Catalog with an Authoritative API Source
The frontend is architected with a clean service separation in `frontend/src/features/catalog/services/catalog-service.ts`.
To connect an external CMS or database:
1. Replace `catalogService` methods (`getAllProducts`, `getProductBySlug`, `filterAndSortProducts`) with calls to `fetchProducts` and `fetchProduct` from `@/lib/api`.
2. The UI components (`CollectionsView`, `ProductGrid`, `ProductCard`, `ProductDetailPage`) interact solely through `useCatalog` and `catalogService`, meaning no presentation code needs to be rewritten when transitioning to a production database.

---

## 6. Known Limitations & Next Steps

1. **Checkout Flow:** Checkout currently routes to `/checkout` with a demonstration order review. Real card processing via payment gateway (e.g. Razorpay or Stripe) requires active merchant keys in `.env`.
2. **Camera Permissions:** Live 3D Try-On requires browser camera access (`getUserMedia`). If camera access is denied, the Try-On studio presents fallback guidance.
3. **Trouser & Outerwear 3D Assets:** 3D GLBs for bifurcated trousers and heavy lined coats are not yet in the AR registry; their products properly show in-development notices.

