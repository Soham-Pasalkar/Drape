"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ArrowUpRight, Sparkles } from "lucide-react";
import {
  CategorySummary,
  ProductFilterParams,
  ProductSummary,
  fetchCategories,
  fetchProducts,
} from "@/lib/api";

const CORE_CATEGORIES = [
  { id: "all", label: "All Editions" },
  { id: "coats", label: "Coats" },
  { id: "jackets", label: "Jackets" },
  { id: "shirts", label: "Shirts" },
  { id: "trousers", label: "Trousers" },
  { id: "knitwear", label: "Knitwear" },
  { id: "accessories", label: "Accessories" },
];

const SIZES = ["XS", "S", "M", "L", "XL", "OS"];

export default function CollectionsView({
  initialCategory,
}: {
  initialCategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategory || searchParams.get("category") || "all"
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") || ""
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    searchParams.get("size") || ""
  );
  const [sortBy, setSortBy] = useState<"featured" | "price_asc" | "price_desc" | "newest">(
    (searchParams.get("sort_by") as "featured" | "price_asc" | "price_desc" | "newest") || "featured"
  );

  // Load Categories on mount
  useEffect(() => {
    fetchCategories()
      .then((res) => setCategories(res.categories))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Fetch products when filters change
  const loadFilteredProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: ProductFilterParams = {
        sort_by: sortBy,
        page_size: 40,
      };

      if (activeCategory && activeCategory !== "all") {
        params.category = activeCategory;
      }
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      if (selectedSize) {
        params.size = selectedSize;
      }

      const res = await fetchProducts(params);
      setProducts(res.items);
      setTotalCount(res.total);
    } catch (err: unknown) {
      console.error("Failed to load products:", err);
      setError(err instanceof Error ? err.message : "Failed to load collection.");
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, searchQuery, selectedSize, sortBy]);

  useEffect(() => {
    loadFilteredProducts();
  }, [loadFilteredProducts]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    if (catId === "all") {
      router.push("/collections");
    } else {
      router.push(`/collections/${catId}`);
    }
  };

  const clearAllFilters = () => {
    setActiveCategory("all");
    setSearchQuery("");
    setSelectedSize("");
    setSortBy("featured");
    router.push("/collections");
  };

  const getCategoryCount = (catId: string): number | null => {
    if (catId === "all") return null;
    const found = categories.find((c) => c.name.toLowerCase() === catId.toLowerCase());
    return found ? found.count : null;
  };

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Editorial Collection Header */}
        <div className="border-b border-ink-black/10 pb-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-3">
                AUTUMN / WINTER 2026 • READY-TO-WEAR ARCHIVE
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black capitalize">
                {activeCategory === "all" ? "The Full Atelier Collection" : `${activeCategory} Collection`}
              </h1>
            </div>
            <p className="max-w-md font-sans text-xs sm:text-sm text-ink-black/70 leading-relaxed">
              Explore sensory textiles, sculptural silhouettes, and architectural tailoring
              engineered for real-time digital drape and physical permanence.
            </p>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto pb-4 mb-8 scrollbar-none border-b border-ink-black/5">
          {CORE_CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id);
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-mono tracking-wider uppercase transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-ink-black text-warm-ivory shadow-sm"
                    : "bg-ink-black/5 text-ink-black/80 hover:bg-ink-black/10"
                }`}
              >
                {cat.label}
                {count !== null && (
                  <span
                    className={`ml-1.5 text-[10px] ${
                      isActive ? "text-warm-ivory/70" : "text-ink-black/50"
                    }`}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters and Controls Row */}
        <div className="bg-white/50 backdrop-blur-sm border border-ink-black/10 p-4 sm:p-5 mb-10 rounded-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-black/40" />
              <input
                type="text"
                placeholder="Search by silhouette, material, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-warm-ivory/80 border border-ink-black/15 pl-10 pr-9 py-2 text-xs font-mono tracking-wide placeholder:text-ink-black/40 focus:outline-none focus:border-electric-blue transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-black/40 hover:text-ink-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Size Filters and Sorting */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono">
              {/* Size selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-ink-black/50 text-[10px] uppercase tracking-wider mr-1">
                  SIZE:
                </span>
                {SIZES.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(selectedSize === sz ? "" : sz)}
                    className={`w-7 h-7 flex items-center justify-center text-[10px] border transition-colors ${
                      selectedSize === sz
                        ? "bg-ink-black text-warm-ivory border-ink-black"
                        : "border-ink-black/20 text-ink-black/70 hover:border-ink-black"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* Sort by */}
              <div className="flex items-center space-x-2 pl-2 border-l border-ink-black/10">
                <SlidersHorizontal className="w-3.5 h-3.5 text-ink-black/50" />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "featured" | "price_asc" | "price_desc" | "newest"
                    )
                  }
                  className="bg-transparent border border-ink-black/15 py-1.5 px-2 text-xs font-mono focus:outline-none focus:border-electric-blue cursor-pointer"
                >
                  <option value="featured">Featured Curations</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {(searchQuery || selectedSize || activeCategory !== "all") && (
            <div className="mt-3 pt-3 border-t border-ink-black/5 flex items-center justify-between text-xs font-mono">
              <span className="text-ink-black/60 text-[11px]">
                Showing {totalCount} matching {totalCount === 1 ? "piece" : "pieces"}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-electric-blue hover:underline flex items-center space-x-1 text-[11px]"
              >
                <span>Reset all filters</span>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
            <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
              Curating Atelier Collection...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 p-6 text-center my-8 rounded-sm">
            <p className="text-red-800 text-sm font-sans mb-3">{error}</p>
            <button
              onClick={loadFilteredProducts}
              className="px-4 py-2 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && products.length === 0 && (
          <div className="py-20 text-center border border-dashed border-ink-black/20 rounded-sm">
            <p className="font-serif text-2xl text-ink-black/80 mb-2">
              No matching pieces found
            </p>
            <p className="font-sans text-xs text-ink-black/60 max-w-sm mx-auto mb-6">
              Adjust your search term, size, or category filter to discover pieces from the archive.
            </p>
            <button
              onClick={clearAllFilters}
              className="px-6 py-2.5 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
            {products.map((product) => {
              const mainImg = product.primary_image || "/images/collection-essentials.jpg";
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group block"
                >
                  {/* Card Image Container */}
                  <div className="relative aspect-[3/4] bg-ink-black/5 overflow-hidden mb-4 border border-ink-black/10">
                    {/* Image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mainImg}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                    />

                    {/* Subtle Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                      {product.featured && (
                        <span className="bg-ink-black text-warm-ivory text-[9px] font-mono tracking-widest uppercase px-2 py-0.5">
                          PLATE EDITION
                        </span>
                      )}
                      {product.try_on_enabled && (
                        <span className="bg-electric-blue text-white text-[9px] font-mono tracking-widest uppercase px-2 py-0.5 flex items-center space-x-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AR TRY-ON</span>
                        </span>
                      )}
                      {!product.in_stock && (
                        <span className="bg-red-700 text-white text-[9px] font-mono tracking-widest uppercase px-2 py-0.5">
                          SOLD OUT
                        </span>
                      )}
                    </div>

                    {/* Quick View Hover Indicator */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-ink-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between text-warm-ivory">
                      <span className="font-mono text-[10px] uppercase tracking-widest">
                        Examine Piece
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-warm-ivory" />
                    </div>
                  </div>

                  {/* Card Meta */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-ink-black/60">
                      <span>{product.brand}</span>
                      <span>{product.category}</span>
                    </div>

                    <h2 className="font-serif text-base font-normal text-ink-black group-hover:text-electric-blue transition-colors leading-snug">
                      {product.name}
                    </h2>

                    {product.material && (
                      <p className="text-[11px] font-sans text-ink-black/60 italic line-clamp-1">
                        {product.material}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-xs font-medium text-ink-black">
                        ${product.price.toLocaleString("en-US", { minimumFractionDigits: 0 })} {product.currency}
                      </span>

                      {/* Color indicators */}
                      {product.available_colors && product.available_colors.length > 0 && (
                        <div className="flex items-center space-x-1.5">
                          {product.available_colors.map((c, idx) => (
                            <span
                              key={idx}
                              title={c.name}
                              className="w-2.5 h-2.5 rounded-full border border-ink-black/20"
                              style={{ backgroundColor: c.code || "#333" }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

