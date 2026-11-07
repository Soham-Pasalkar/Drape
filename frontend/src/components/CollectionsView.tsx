"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCatalog } from "@/features/catalog/hooks/useCatalog";
import { ProductCategory, CatalogSortOption } from "@/features/catalog/types";
import CatalogHeader from "./catalog/CatalogHeader";
import CatalogFilters from "./catalog/CatalogFilters";
import ProductSort from "./catalog/ProductSort";
import ProductGrid from "./catalog/ProductGrid";

interface CollectionsViewProps {
  initialCategory?: string;
}

export default function CollectionsView({ initialCategory }: CollectionsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial params
  const categoryParam = (initialCategory || searchParams.get("category") || "all") as
    | ProductCategory
    | "all";
  const queryParam = searchParams.get("q") || "";
  const sizeParam = searchParams.get("size") || "";
  const colorParam = searchParams.get("color") || "";
  const sortParam = (searchParams.get("sort_by") as CatalogSortOption) || "featured";

  const {
    products,
    totalCount,
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
  } = useCatalog({
    initialCategory: categoryParam,
    initialQuery: queryParam,
    initialSize: sizeParam,
    initialColor: colorParam,
    initialSortBy: sortParam,
  });

  // Sync category changes with router where appropriate
  const handleCategorySelect = (newCat: ProductCategory | "all") => {
    setCategory(newCat);
    if (newCat === "all") {
      router.push("/collections", { scroll: false });
    } else {
      router.push(`/collections/${newCat}`, { scroll: false });
    }
  };

  const handleClearAll = () => {
    clearAllFilters();
    router.push("/collections", { scroll: false });
  };

  // Sync if URL search params change externally
  useEffect(() => {
    if (initialCategory) {
      setCategory(initialCategory as ProductCategory);
    }
  }, [initialCategory, setCategory]);

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-10 sm:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* 1. Masthead Header */}
        <CatalogHeader totalCount={totalCount} />

        {/* 2. Filter Controls Strip */}
        <CatalogFilters
          facets={facets}
          activeCategory={filterState.category}
          onSelectCategory={handleCategorySelect}
          searchQuery={filterState.query}
          onSearchChange={setQuery}
          availableSizes={availableSizes}
          selectedSize={filterState.size}
          onSelectSize={setSize}
          availableColors={availableColors}
          selectedColor={filterState.color}
          onSelectColor={setColor}
          hasActiveFilters={hasActiveFilters}
          onClearAll={handleClearAll}
        />

        {/* 3. Sort & Results Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-ink-black/10 gap-3">
          <p className="font-mono text-xs text-ink-black/60 uppercase tracking-widest">
            Showing {totalCount} {totalCount === 1 ? "Silhouette" : "Silhouettes"}
            {filterState.category !== "all" && ` in ${filterState.category}`}
          </p>

          <ProductSort value={filterState.sortBy} onChange={setSortBy} />
        </div>

        {/* 4. Product Grid */}
        <ProductGrid products={products} onResetFilters={handleClearAll} />
      </div>
    </div>
  );
}
