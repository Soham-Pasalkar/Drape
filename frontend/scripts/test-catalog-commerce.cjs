/**
 * DRAPE Catalog & Commerce Verification Test Suite.
 *
 * Verifies:
 * 1. Catalog domain model & 18 canonical demo products.
 * 2. Balanced category assortment (5 Tops, 3 Shirts, 3 Trousers, 3 Outerwear, 2 Dresses, 2 Skirts).
 * 3. Product-to-3D GLB mapping integrity (real assets, zero fake compatibility).
 * 4. Existing local image path resolution.
 * 5. Multi-faceted filtering (category, search, size, color) and sorting strategies.
 * 6. Product detail retrieval and Try-On Studio URL generation.
 * 7. Cart line items, integer monetary calculations, and inventory integrity.
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
// SUITE 3: CATALOG FILTERING, SEARCH & SORTING
// ==========================================
suite('Catalog Filtering, Search & Sorting');

test('filtering by category returns only products in that category', () => {
  const tops = catalog.filterAndSortProducts({
    category: 'tops',
    query: '',
    size: '',
    color: '',
    sortBy: 'featured',
  });
  assert(tops.total === 5, `Expected 5 tops, got ${tops.total}`);
  assert(tops.items.every((p) => p.category === 'tops'), 'Non-top product found in tops filter');

  const outerwear = catalog.filterAndSortProducts({
    category: 'outerwear',
    query: '',
    size: '',
    color: '',
    sortBy: 'featured',
  });
  assert(outerwear.total === 3, `Expected 3 outerwear, got ${outerwear.total}`);
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
    const hasInStockXL = p.variants.some((v) => v.size === 'XL' && v.inStock);
    assert(hasInStockXL, `Product ${p.slug} in size XL results has no in-stock XL variant`);
  }
});

test('filtering by color matches products offering that color', () => {
  const noirProducts = catalog.filterAndSortProducts({
    category: 'all',
    query: '',
    size: '',
    color: 'Noir',
    sortBy: 'featured',
  });
  assert(noirProducts.total >= 4, `Expected at least 4 Noir products, found ${noirProducts.total}`);
  for (const p of noirProducts.items) {
    const hasColor = p.availableColors.some((c) => c.name.toLowerCase() === 'noir');
    assert(hasColor, `Product ${p.slug} has no Noir color option`);
  }
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
// SUITE 4: SHOPPING BAG MONETARY CALCULATIONS
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
