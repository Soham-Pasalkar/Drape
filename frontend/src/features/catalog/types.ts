/**
 * DRAPE Canonical Product Catalog Domain Types.
 *
 * Defines strongly-typed representations for products, SKUs, variants,
 * monetary pricing (integer minor units), 3D try-on asset mappings,
 * and multi-faceted catalog filtering/sorting parameters.
 */

export type ProductCategory =
  | "tops"
  | "shirts"
  | "trousers"
  | "outerwear"
  | "dresses"
  | "skirts";

export interface ProductCategoryMetadata {
  id: ProductCategory;
  label: string;
  description: string;
}

export interface ProductPrice {
  /** Integer cents (minor units, e.g. 18000 = $180.00) */
  amountMinor: number;
  /** Decimal units for display convenience */
  amount: number;
  /** ISO 4217 Currency Code */
  currency: "USD";
  /** Human-readable formatted string */
  formatted: string;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ProductColor {
  name: string;
  code: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorCode: string;
  inStock: boolean;
  quantity: number;
  isActive: boolean;
}

export interface TryOnMapping {
  /** Whether a real, compatible 3D asset exists in the garment registry */
  available: boolean;
  /** Actual registered garment ID matching frontend/src/lib/ar/garment-registry.ts, or null */
  garmentId: string | null;
  /** Contextual explanation when try-on is unavailable or details on the 3D model */
  explanation?: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ProductCategory;
  brand: string;
  price: ProductPrice;
  images: ProductImage[];
  variants: ProductVariant[];
  availableSizes: string[];
  availableColors: ProductColor[];
  material: string;
  careInstructions: string[];
  tryOn: TryOnMapping;
  featured: boolean;
  status: "active" | "draft" | "archived";
  createdAt: string;
}

export type CatalogSortOption =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "newest";

export interface CatalogFilterState {
  category: ProductCategory | "all";
  query: string;
  size: string;
  color: string;
  sortBy: CatalogSortOption;
}

export interface CategoryFacet {
  id: ProductCategory | "all";
  label: string;
  count: number;
}
