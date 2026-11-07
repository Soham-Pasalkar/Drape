/**
 * DRAPE Catalog Service.
 *
 * Provides deterministic querying, filtering, search, and sorting
 * across canonical atelier products, with support for active category facets.
 */

import { DEMO_PRODUCTS } from "../data/demo-products";
import {
  CatalogFilterState,
  CatalogSortOption,
  CategoryFacet,
  Product,
  ProductCategory,
  ProductColor,
} from "../types";

export const CATEGORY_METADATA: Array<{ id: ProductCategory; label: string }> = [
  { id: "tops", label: "Tops & Tees" },
  { id: "shirts", label: "Shirts" },
  { id: "trousers", label: "Trousers" },
  { id: "outerwear", label: "Outerwear & Coats" },
  { id: "dresses", label: "Dresses" },
  { id: "skirts", label: "Skirts" },
];

export class CatalogService {
  private readonly products: Product[];

  constructor(products: Product[] = DEMO_PRODUCTS) {
    this.products = products;
  }

  /**
   * Retrieves all active products in the canonical catalog.
   */
  getAllProducts(): Product[] {
    return this.products.filter((p) => p.status === "active");
  }

  /**
   * Resolves a single product by unique URL slug.
   */
  getProductBySlug(slug: string): Product | undefined {
    const clean = slug.trim().toLowerCase();
    return this.products.find(
      (p) => p.slug.toLowerCase() === clean && p.status === "active"
    );
  }

  /**
   * Resolves a single product by unique product ID or SKU.
   */
  getProductById(idOrSku: string): Product | undefined {
    const clean = idOrSku.trim().toLowerCase();
    return this.products.find(
      (p) =>
        (p.id.toLowerCase() === clean || p.sku.toLowerCase() === clean) &&
        p.status === "active"
    );
  }

  /**
   * Retrieves products belonging to a specific category.
   */
  getProductsByCategory(category: ProductCategory): Product[] {
    return this.products.filter(
      (p) => p.category === category && p.status === "active"
    );
  }

  /**
   * Returns category facet summaries with accurate live product counts.
   */
  getCategoryFacets(): CategoryFacet[] {
    const active = this.getAllProducts();
    const allFacet: CategoryFacet = {
      id: "all",
      label: "All Editions",
      count: active.length,
    };

    const categoryFacets: CategoryFacet[] = CATEGORY_METADATA.map((meta) => {
      const count = active.filter((p) => p.category === meta.id).length;
      return {
        id: meta.id,
        label: meta.label,
        count,
      };
    });

    return [allFacet, ...categoryFacets];
  }

  /**
   * Extracts distinct unique colors across the catalog.
   */
  getAvailableColors(): ProductColor[] {
    const map = new Map<string, string>();
    this.getAllProducts().forEach((p) => {
      p.availableColors.forEach((c) => {
        if (!map.has(c.name)) {
          map.set(c.name, c.code);
        }
      });
    });
    return Array.from(map.entries()).map(([name, code]) => ({ name, code }));
  }

  /**
   * Extracts distinct unique sizes across the catalog.
   */
  getAvailableSizes(): string[] {
    const sizeSet = new Set<string>();
    this.getAllProducts().forEach((p) => {
      p.availableSizes.forEach((s) => sizeSet.add(s));
    });
    const standardOrder = ["XS", "S", "M", "L", "XL", "XXL"];
    return Array.from(sizeSet).sort((a, b) => {
      const idxA = standardOrder.indexOf(a);
      const idxB = standardOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }

  /**
   * Applies multi-faceted filtering (category, search, size, color) and sorting.
   */
  filterAndSortProducts(filters: CatalogFilterState): {
    items: Product[];
    total: number;
  } {
    let result = this.getAllProducts();

    // 1. Category Filter
    if (filters.category && filters.category !== "all") {
      result = result.filter((p) => p.category === filters.category);
    }

    // 2. Lexical Keyword Search
    if (filters.query && filters.query.trim()) {
      const terms = filters.query.toLowerCase().trim().split(/\s+/);
      result = result.filter((p) => {
        const searchable = `${p.name} ${p.shortDescription} ${p.description} ${p.material} ${p.sku} ${p.category}`.toLowerCase();
        return terms.every((t) => searchable.includes(t));
      });
    }

    // 3. Size Filter
    if (filters.size && filters.size.trim()) {
      const sizeTarget = filters.size.trim().toUpperCase();
      result = result.filter((p) =>
        p.variants.some(
          (v) => v.size.toUpperCase() === sizeTarget && v.inStock && v.isActive
        )
      );
    }

    // 4. Color Filter
    if (filters.color && filters.color.trim()) {
      const colorTarget = filters.color.trim().toLowerCase();
      result = result.filter((p) =>
        p.availableColors.some((c) => c.name.toLowerCase() === colorTarget)
      );
    }

    // 5. Sorting
    result = this.sortProducts(result, filters.sortBy);

    return {
      items: result,
      total: result.length,
    };
  }

  private sortProducts(items: Product[], sort: CatalogSortOption): Product[] {
    const sorted = [...items];
    switch (sort) {
      case "price_asc":
        return sorted.sort((a, b) => a.price.amountMinor - b.price.amountMinor);
      case "price_desc":
        return sorted.sort((a, b) => b.price.amountMinor - a.price.amountMinor);
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "featured":
      default:
        return sorted.sort((a, b) => {
          if (a.featured === b.featured) return 0;
          return a.featured ? -1 : 1;
        });
    }
  }
}

export const catalogService = new CatalogService();
