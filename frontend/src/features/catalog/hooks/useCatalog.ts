"use client";

/**
 * DRAPE useCatalog Hook.
 *
 * Encapsulates client-side catalog filtering, search, and sorting logic
 * with reactive state updates and clear-all-filters capabilities.
 */

import { useState, useMemo, useCallback } from "react";
import {
  CatalogFilterState,
  CatalogSortOption,
  CategoryFacet,
  Product,
  ProductCategory,
  ProductColor,
} from "../types";
import { catalogService } from "../services/catalog-service";

export interface UseCatalogOptions {
  initialCategory?: ProductCategory | "all";
  initialQuery?: string;
  initialSize?: string;
  initialColor?: string;
  initialSortBy?: CatalogSortOption;
}

export function useCatalog(options: UseCatalogOptions = {}) {
  const [category, setCategory] = useState<ProductCategory | "all">(
    options.initialCategory || "all"
  );
  const [query, setQuery] = useState<string>(options.initialQuery || "");
  const [size, setSize] = useState<string>(options.initialSize || "");
  const [color, setColor] = useState<string>(options.initialColor || "");
  const [sortBy, setSortBy] = useState<CatalogSortOption>(
    options.initialSortBy || "featured"
  );

  const filterState: CatalogFilterState = useMemo(
    () => ({
      category,
      query,
      size,
      color,
      sortBy,
    }),
    [category, query, size, color, sortBy]
  );

  const { items, total } = useMemo(() => {
    return catalogService.filterAndSortProducts(filterState);
  }, [filterState]);

  const facets: CategoryFacet[] = useMemo(() => {
    return catalogService.getCategoryFacets();
  }, []);

  const availableSizes: string[] = useMemo(() => {
    return catalogService.getAvailableSizes();
  }, []);

  const availableColors: ProductColor[] = useMemo(() => {
    return catalogService.getAvailableColors();
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      category !== "all" ||
      query.trim() !== "" ||
      size !== "" ||
      color !== "" ||
      sortBy !== "featured"
    );
  }, [category, query, size, color, sortBy]);

  const clearAllFilters = useCallback(() => {
    setCategory("all");
    setQuery("");
    setSize("");
    setColor("");
    setSortBy("featured");
  }, []);

  return {
    products: items,
    totalCount: total,
    facets,
    availableSizes,
    availableColors,
    hasActiveFilters,
    filterState,
    setCategory,
    setQuery,
    setSize,
    setColor,
    setSortBy,
    clearAllFilters,
  };
}

