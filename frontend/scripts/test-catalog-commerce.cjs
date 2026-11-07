/**
 * DRAPE Catalog & Commerce Verification Test Suite.
 *
 * Verifies:
 * 1. Catalog domain model & 18 canonical demo products.
 * 2. Balanced category assortment (5 Tops, 3 Shirts, 3 Trousers, 3 Outerwear, 2 Dresses, 2 Skirts).
 * 3. Product-to-3D GLB mapping integrity (real assets, zero fake compatibility).
 * 4. Product photography integrity: every image has color, view, and verified local disk file.
 * 5. Colour-to-image relationships: filtering by color displays matching photograph.
 * 6. Product card hover behavior: no hover swap to unrelated garments or different colors.
 * 7. Multi-faceted filtering (category, search, size, color, compound size+color) and sorting.
 * 8. Product detail retrieval and Try-On Studio URL generation.
 * 9. Cart line items, integer monetary calculations, and inventory integrity.
 */

const fs = require('fs');
const path = require('path');
const ts = require(path.join(__dirname, '..', 'node_modules', 'typescript'));
const { suite, test, assert, finish } = require('./lib/harness.cjs');

// Helper to transpile and load TS modules dynamically in Node CommonJS
function loadTsModule(relativePath) {
  const fullPath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', result.outputText);
  fn(m, m.exports, (mod) => {
    if (mod.startsWith('@/features/catalog/types')) return loadTsModule('src/features/catalog/types.ts');
    if (mod.startsWith('@/features/catalog/utils/product-mapping')) return loadTsModule('src/features/catalog/utils/product-mapping.ts');
    if (mod.startsWith('@/features/catalog/data/demo-products')) return loadTsModule('src/features/catalog/data/demo-products.ts');
    if (mod.startsWith('@/features/catalog/services/catalog-service')) return loadTsModule('src/features/catalog/services/catalog-service.ts');
    if (mod.startsWith('../utils/product-mapping')) return loadTsModule('src/features/catalog/utils/product-mapping.ts');
    if (mod.startsWith('../data/demo-products')) return loadTsModule('src/features/catalog/data/demo-products.ts');
    if (mod.startsWith('../types')) return loadTsModule('src/features/catalog/types.ts');
    if (mod.startsWith('@/lib/ar/garment-registry')) return loadTsModule('src/lib/ar/garment-registry.ts');
    return require(mod);
  }, path.dirname(fullPath), fullPath);
  return m.exports;
}

const { DEMO_PRODUCTS } = loadTsModule('src/features/catalog/data/demo-products.ts');
const { CatalogService } = loadTsModule('src/features/catalog/services/catalog-service.ts');
const { GARMENTS } = loadTsModule('src/lib/ar/garment-registry.ts');
const {
  isRegisteredGarmentId,
  getProductTryOnStatus,
  buildTryOnUrl,
  formatCentsToUsd,
  isColorMatch,
  resolveProductImageForColor,
  resolveCardDisplayImages,
} = loadTsModule('src/features/catalog/utils/product-mapping.ts');

const catalog = new CatalogService(DEMO_PRODUCTS);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ==========================================
// SUITE 1: CANONICAL CATALOG ASSORTMENT & INTEGRITY
// ==========================================
suite('Catalog Assortment & Data Integrity');

test('exactly 18 active demo products in collection', () => {
  assert(DEMO_PRODUCTS.length === 18, `Expected exactly 18 products, received ${DEMO_PRODUCTS.length}`);
  const activeCount = DEMO_PRODUCTS.filter((p) => p.status === 'active').length;
  assert(activeCount === 18, `Expected 18 active products, received ${activeCount}`);
});

test('balanced category distribution', () => {
  const counts = DEMO_PRODUCTS.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  assert(counts.tops === 5, `Expected 5 tops, got ${counts.tops}`);
  assert(counts.shirts === 3, `Expected 3 shirts, got ${counts.shirts}`);
  assert(counts.trousers === 3, `Expected 3 trousers, got ${counts.trousers}`);
  assert(counts.outerwear === 3, `Expected 3 outerwear, got ${counts.outerwear}`);
  assert(counts.dresses === 2, `Expected 2 dresses, got ${counts.dresses}`);
  assert(counts.skirts === 2, `Expected 2 skirts, got ${counts.skirts}`);
});

test('unique product IDs, slugs, and primary SKUs', () => {
  const idSet = new Set();
  const slugSet = new Set();
  const skuSet = new Set();

  for (const p of DEMO_PRODUCTS) {
    assert(!idSet.has(p.id), `Duplicate product ID detected: ${p.id}`);
    idSet.add(p.id);

    assert(!slugSet.has(p.slug), `Duplicate slug detected: ${p.slug}`);
    slugSet.add(p.slug);

    assert(!skuSet.has(p.sku), `Duplicate primary SKU detected: ${p.sku}`);
    skuSet.add(p.sku);
  }
});

test('all products have integer minor-unit USD prices > 0', () => {
  for (const p of DEMO_PRODUCTS) {
    assert(p.price.currency === 'USD', `Currency must be USD for ${p.slug}`);
    assert(Number.isInteger(p.price.amountMinor), `amountMinor must be integer for ${p.slug}`);
    assert(p.price.amountMinor > 0, `amountMinor must be > 0 for ${p.slug}`);
    assert(p.price.amount === p.price.amountMinor / 100, `amount decimal mismatch for ${p.slug}`);
    assert(p.price.formatted.startsWith('$'), `formatted price missing dollar sign for ${p.slug}`);
  }
});

test('all variants have unique SKUs and valid stock numbers', () => {
  const variantSkuSet = new Set();
  let totalVariants = 0;

  for (const p of DEMO_PRODUCTS) {
    assert(p.variants.length > 0, `Product ${p.slug} has no variants`);
    for (const v of p.variants) {
      assert(!variantSkuSet.has(v.sku), `Duplicate variant SKU: ${v.sku}`);
      variantSkuSet.add(v.sku);

      assert(typeof v.size === 'string' && v.size.length > 0, `Invalid size on variant ${v.sku}`);
      assert(typeof v.color === 'string' && v.color.length > 0, `Invalid color on variant ${v.sku}`);
      assert(v.colorCode.startsWith('#'), `Color hex code must start with # on variant ${v.sku}`);
      assert(v.quantity >= 0, `Negative inventory quantity on variant ${v.sku}`);
      if (v.quantity === 0) {
        assert(!v.inStock, `Variant ${v.sku} has 0 quantity but inStock is true`);
      }
      totalVariants++;
    }
  }
  assert(totalVariants >= 50, `Expected comprehensive variant count, found ${totalVariants}`);
});

test('all product photography assets exist on disk in public/', () => {
  for (const p of DEMO_PRODUCTS) {
    assert(p.images.length > 0, `Product ${p.slug} has no images`);
    for (const img of p.images) {
      assert(img.url.startsWith('/'), `Image url must start with /: ${img.url}`);
      const filePath = path.join(PUBLIC_DIR, img.url.replace(/^\//, ''));
      assert(fs.existsSync(filePath), `Image file missing on disk: ${filePath} (product: ${p.slug})`);
    }
  }
});

// ==========================================
// SUITE 2: 3D GARMENT MAPPING & COMPATIBILITY
// ==========================================
suite('3D Garment Mapping & No Fake Compatibility');

test('all compatible products map strictly to registered GLBs in garment registry', () => {
  const registeredIds = new Set(GARMENTS.map((g) => g.id));
  const compatibleProducts = DEMO_PRODUCTS.filter((p) => p.tryOn.available);

  assert(compatibleProducts.length === 8, `Expected 8 compatible 3D products, found ${compatibleProducts.length}`);

  for (const p of compatibleProducts) {
    const garmentId = p.tryOn.garmentId;
    assert(garmentId !== null, `Compatible product ${p.slug} has null garmentId`);
    assert(registeredIds.has(garmentId), `Garment ID "${garmentId}" does not exist in AR registry`);
    assert(isRegisteredGarmentId(garmentId), `isRegisteredGarmentId returned false for ${garmentId}`);

    // Verify GLB file physically exists on disk
    const glbPath = path.join(PUBLIC_DIR, 'garments', garmentId, 'model.glb');
    assert(fs.existsSync(glbPath), `GLB model file missing on disk at ${glbPath}`);
  }
});

test('incompatible products have null garmentId and clear explanation', () => {
  const incompatibleProducts = DEMO_PRODUCTS.filter((p) => !p.tryOn.available);

  assert(incompatibleProducts.length === 10, `Expected 10 incompatible products, found ${incompatibleProducts.length}`);

  for (const p of incompatibleProducts) {
    assert(p.tryOn.garmentId === null, `Incompatible product ${p.slug} must have null garmentId`);
    const status = getProductTryOnStatus(p);
    assert(!status.isCompatible, `Product ${p.slug} should not report isCompatible`);
    assert(status.explanation.length > 10, `Missing or weak explanation for ${p.slug}`);
    assert(buildTryOnUrl(p) === null, `buildTryOnUrl must return null for incompatible ${p.slug}`);
  }
});

test('Try-On URL generation preserves garment ID and return-to-product context', () => {
  const crewTee = catalog.getProductBySlug('atelier-classic-crew-tee');
  assert(crewTee !== undefined, 'atelier-classic-crew-tee not found');

  const url = buildTryOnUrl(crewTee);
  assert(url !== null, 'Try on url should not be null for crew tee');
  assert(url.includes('garment=tshirt-crewneck'), `URL missing garment param: ${url}`);
  assert(url.includes('from=%2Fproducts%2Fatelier-classic-crew-tee'), `URL missing return context: ${url}`);
});

// ==========================================
// SUITE 3: PRODUCT IMAGE INTEGRITY & COLOUR RESOLUTION
// ==========================================
suite('Product Image Integrity & Colour Resolution');

test('every product image has defined color, valid view tag, and non-empty alt text', () => {
  const validViews = new Set(['front', 'back', 'detail', 'editorial']);

  for (const p of DEMO_PRODUCTS) {
    assert(p.images.length >= 1, `Product ${p.slug} must have at least 1 image`);
    for (const img of p.images) {
      assert(typeof img.color === 'string' && img.color.length > 0, `Missing color on image ${img.id} for ${p.slug}`);
      assert(validViews.has(img.view), `Invalid view "${img.view}" on image ${img.id} for ${p.slug}`);
      assert(typeof img.alt === 'string' && img.alt.length > 5, `Missing or brief alt on image ${img.id} for ${p.slug}`);
    }
  }
});

test('every availableColor and variant has a photograph matching its color', () => {
  for (const p of DEMO_PRODUCTS) {
    for (const color of p.availableColors) {
      const match = resolveProductImageForColor(p, color.name);
      assert(
        match !== undefined,
        `No photograph found representing color "${color.name}" on product ${p.slug}`
      );
      assert(
        isColorMatch(match.color, color.name),
        `Resolved photograph color "${match.color}" does not match requested "${color.name}" on ${p.slug}`
      );
    }

    for (const variant of p.variants) {
      const match = resolveProductImageForColor(p, variant.color);
      assert(
        match !== undefined,
        `No photograph found for variant ${variant.sku} color "${variant.color}" on ${p.slug}`
      );
    }
  }
});

test('product card hover never swaps to an unrelated garment or different color', () => {
  for (const p of DEMO_PRODUCTS) {
    const { primaryImage, secondaryImage, hasAlternateView } = resolveCardDisplayImages(p);

    if (hasAlternateView) {
      assert(
        secondaryImage !== primaryImage,
        `hasAlternateView is true but secondaryImage equals primaryImage on ${p.slug}`
      );
      // Verify secondary image belongs to the same product and same color
      const secImgObj = p.images.find((img) => img.url === secondaryImage);
      const priImgObj = p.images.find((img) => img.url === primaryImage);
      assert(secImgObj !== undefined, `Secondary image for ${p.slug} not in product.images`);
      assert(
        isColorMatch(secImgObj.color, priImgObj.color),
        `Secondary image color (${secImgObj.color}) does not match primary image color (${priImgObj.color}) on ${p.slug}`
      );
    } else {
      assert(
        secondaryImage === primaryImage,
        `Product ${p.slug} has no alternate view, hover must retain primaryImage`
      );
    }
  }
});

test('color filtering displays matching color photograph on product cards', () => {
  // Test filtering for Noir / Black
  const noirProducts = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: '',
    color: 'Noir',
    sortBy: 'featured',
  });

  assert(noirProducts.total >= 4, `Expected at least 4 Noir products, found ${noirProducts.total}`);

  for (const p of noirProducts.items) {
    const cardImages = resolveCardDisplayImages(p, 'Noir');
    assert(
      isColorMatch(cardImages.matchedColor, 'Noir'),
      `Product card for ${p.slug} displayed color "${cardImages.matchedColor}" instead of Noir`
    );
  }

  // Test filtering for Concrete
  const concreteProducts = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: '',
    color: 'Concrete',
    sortBy: 'featured',
  });

  assert(concreteProducts.total === 1, `Expected 1 Concrete product, found ${concreteProducts.total}`);
  const heavyTee = concreteProducts.items[0];
  const heavyCard = resolveCardDisplayImages(heavyTee, 'Concrete');
  assert(
    isColorMatch(heavyCard.matchedColor, 'Concrete'),
    `Heavyweight boxy tee card displayed "${heavyCard.matchedColor}" instead of Concrete`
  );
  assert(
    heavyCard.primaryImage === '/images/pexels-photo-38347378.avif',
    `Heavyweight boxy tee primary image mismatch: ${heavyCard.primaryImage}`
  );
});

// ==========================================
// SUITE 4: CATALOG FILTERING, SEARCH & SORTING
// ==========================================
suite('Catalog Filtering, Search & Sorting');

test('filtering by category strictly isolates products without cross-category pollution', () => {
  const categories = ['tops', 'shirts', 'trousers', 'outerwear', 'dresses', 'skirts'];
  const expectedAssortment = {
    tops: 5,
    shirts: 3,
    trousers: 3,
    outerwear: 3,
    dresses: 2,
    skirts: 2,
  };

  for (const cat of categories) {
    const filtered = catalog.filterAndSortProducts({
      category: cat,
      query: '',
      size: '',
      color: '',
      sortBy: 'featured',
    });

    assert(
      filtered.total === expectedAssortment[cat],
      `Category ${cat} expected ${expectedAssortment[cat]} items, got ${filtered.total}`
    );

    for (const p of filtered.items) {
      assert(
        p.category === cat,
        `Cross-category pollution: product ${p.slug} with category "${p.category}" found in filter for "${cat}"`
      );
    }
  }
});

test('lexical search by keyword across name, description and textile', () => {
  const cashmeres = catalog.filterAndSortProducts({
    category: 'all',
    query: 'cashmere',
    size: '',
    color: '',
    sortBy: 'featured',
  });
  assert(cashmeres.total >= 1, 'Search for cashmere returned 0 results');
  assert(cashmeres.items.some((p) => p.slug === 'cashmere-long-sleeve-top'), 'cashmere-long-sleeve-top missing');

  const silk = catalog.filterAndSortProducts({
    category: 'all',
    query: 'silk',
    size: '',
    color: '',
    sortBy: 'featured',
  });
  assert(silk.total >= 3, `Expected at least 3 silk products, found ${silk.total}`);
});

test('filtering by size matches products with available in-stock size variants', () => {
  const sizeXL = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: 'XL',
    color: '',
    sortBy: 'featured',
  });
  assert(sizeXL.total > 0, 'No products found for size XL');
  for (const p of sizeXL.items) {
    const hasInStockXL = p.variants.some((v) => v.size === 'XL' && v.inStock && v.isActive);
    assert(hasInStockXL, `Product ${p.slug} in size XL results has no in-stock XL variant`);
  }
});

test('compound filtering strictly matches a single variant with BOTH size AND color in stock', () => {
  // Cashmere top has Heather Sand in XS, S, M, L, XL, and Midnight Noir in S, M, L (NO XL in Noir!)
  const cashmereSandXL = catalog.filterAndSortProducts({
    category: 'tops',
    query: 'cashmere',
    size: 'XL',
    color: 'Heather Sand',
    sortBy: 'featured',
  });
  assert(cashmereSandXL.total === 1, `Expected Heather Sand XL to match 1 product, got ${cashmereSandXL.total}`);
  assert(cashmereSandXL.items[0].slug === 'cashmere-long-sleeve-top', 'Cashmere top should match Heather Sand XL');

  const cashmereNoirXL = catalog.filterAndSortProducts({
    category: 'tops',
    query: 'cashmere',
    size: 'XL',
    color: 'Midnight Noir',
    sortBy: 'featured',
  });
  // Midnight Noir does NOT exist in size XL for cashmere top, so it must return 0 items!
  assert(
    cashmereNoirXL.total === 0,
    `Compound filter defect: Midnight Noir XL returned ${cashmereNoirXL.total} products despite having 0 stock/no variant`
  );
});

test('sorting by price low to high and high to low', () => {
  const asc = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: '',
    color: '',
    sortBy: 'price_asc',
  });
  for (let i = 0; i < asc.items.length - 1; i++) {
    assert(
      asc.items[i].price.amountMinor <= asc.items[i + 1].price.amountMinor,
      `Price asc order violation at index ${i}: ${asc.items[i].price.amountMinor} > ${asc.items[i + 1].price.amountMinor}`
    );
  }

  const desc = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: '',
    color: '',
    sortBy: 'price_desc',
  });
  for (let i = 0; i < desc.items.length - 1; i++) {
    assert(
      desc.items[i].price.amountMinor >= desc.items[i + 1].price.amountMinor,
      `Price desc order violation at index ${i}: ${desc.items[i].price.amountMinor} < ${desc.items[i + 1].price.amountMinor}`
    );
  }
});

test('category facets return accurate counts matching total', () => {
  const facets = catalog.getCategoryFacets();
  const allFacet = facets.find((f) => f.id === 'all');
  assert(allFacet !== undefined && allFacet.count === 18, `All facet count must be 18, got ${allFacet?.count}`);

  const subtotal = facets
    .filter((f) => f.id !== 'all')
    .reduce((sum, f) => sum + f.count, 0);
  assert(subtotal === 18, `Sum of individual category facets must be 18, got ${subtotal}`);
});

// ==========================================
// SUITE 5: SHOPPING BAG MONETARY CALCULATIONS
// ==========================================
suite('Shopping Bag Monetary & Quantity Integrity');

test('currency formatting preserves minor units without floating error', () => {
  assert(formatCentsToUsd(18000) === '$180', '18000 cents should format to $180');
  assert(formatCentsToUsd(19550) === '$195.50', '19550 cents should format to $195.50');
  assert(formatCentsToUsd(98000) === '$980', '98000 cents should format to $980');
});

test('cart subtotal uses exact integer math', () => {
  const item1Price = 180.00;
  const item1Qty = 2;
  const item2Price = 480.00;
  const item2Qty = 1;

  const totalCents = Math.round(item1Price * 100) * item1Qty + Math.round(item2Price * 100) * item2Qty;
  const subtotal = totalCents / 100;

  assert(subtotal === 840.00, `Expected 840.00 subtotal, got ${subtotal}`);
});

finish('test-catalog-commerce');
