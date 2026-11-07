"use client";

import React, { useState } from "react";
import { Search, X, SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import {
  CategoryFacet,
  ProductCategory,
  ProductColor,
} from "@/features/catalog/types";
import { isColorMatch } from "@/features/catalog/utils/product-mapping";

interface CatalogFiltersProps {
  facets: CategoryFacet[];
  activeCategory: ProductCategory | "all";
  onSelectCategory: (category: ProductCategory | "all") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  availableSizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  availableColors: ProductColor[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

export default function CatalogFilters({
  facets,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  availableSizes,
  selectedSize,
  onSelectSize,
  availableColors,
  selectedColor,
  onSelectColor,
  hasActiveFilters,
  onClearAll,
}: CatalogFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <div className="space-y-6 mb-8">
      {/* 1. Category Bar (Horizontal Scroll / Wrap) */}
      <div className="flex items-center justify-between border-b border-ink-black/10 pb-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-max">
          {facets.map((facet) => {
            const isActive = activeCategory === facet.id;
            return (
              <button
                key={facet.id}
                onClick={() => onSelectCategory(facet.id)}
                className={`text-xs font-mono tracking-widest uppercase py-2 px-3 transition-colors relative flex items-center space-x-1.5 ${
                  isActive
                    ? "text-ink-black font-semibold border-b-2 border-ink-black"
                    : "text-ink-black/60 hover:text-ink-black"
                }`}
              >
                <span>{facet.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full ${
                    isActive
                      ? "bg-ink-black text-warm-ivory"
                      : "bg-ink-black/10 text-ink-black/70"
                  }`}
                >
                  {facet.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="md:hidden flex items-center space-x-1.5 text-xs font-mono uppercase tracking-widest px-3 py-1.5 border border-ink-black/20 ml-2"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Refine</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${
              mobileFiltersOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* 2. Secondary Filter Bar: Search, Size, Color, Clear (Always visible on desktop, toggleable on mobile) */}
      <div
        className={`${
          mobileFiltersOpen ? "block" : "hidden"
        } md:block bg-warm-ivory/60 border border-ink-black/10 p-4 sm:p-5`}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-black/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search garments, textiles, silhouettes..."
              className="w-full bg-warm-ivory text-xs font-sans text-ink-black pl-9 pr-8 py-2 border border-ink-black/20 rounded-none focus:outline-none focus:border-ink-black placeholder:text-ink-black/40 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-black/40 hover:text-ink-black"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Size Filter Pills */}
          <div className="md:col-span-4 flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/60 shrink-0">
              Size:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onSelectSize("")}
                className={`text-[10px] font-mono uppercase px-2 py-1 border transition-colors ${
                  selectedSize === ""
                    ? "bg-ink-black text-warm-ivory border-ink-black"
                    : "border-ink-black/20 text-ink-black/70 hover:border-ink-black/60"
                }`}
              >
                All
              </button>
              {availableSizes.map((s) => (
                <button
                  key={s}
                  onClick={() => onSelectSize(selectedSize === s ? "" : s)}
                  className={`text-[10px] font-mono uppercase px-2 py-1 border transition-colors ${
                    selectedSize === s
                      ? "bg-ink-black text-warm-ivory border-ink-black font-semibold"
                      : "border-ink-black/20 text-ink-black/70 hover:border-ink-black/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter Swatches */}
          <div className="md:col-span-3 flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/60 shrink-0">
              Colour:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => onSelectColor("")}
                className={`text-[10px] font-mono uppercase px-2 py-1 border transition-colors ${
                  selectedColor === ""
                    ? "bg-ink-black text-warm-ivory border-ink-black"
                    : "border-ink-black/20 text-ink-black/70 hover:border-ink-black/60"
                }`}
              >
                All
              </button>
              {availableColors.map((c) => {
                const isSelected = selectedColor ? isColorMatch(c.name, selectedColor) : false;
                return (
                  <button
                    key={c.name}
                    onClick={() =>
                      onSelectColor(isSelected ? "" : c.name)
                    }
                    className={`w-5 h-5 rounded-full border relative flex items-center justify-center transition-transform ${
                      isSelected
                        ? "border-electric-blue scale-110 shadow-sm"
                        : "border-ink-black/20 hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.code }}
                    title={c.name}
                    aria-label={`Filter by color ${c.name}`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3 h-3 ${
                          c.code.toLowerCase() === "#ffffff" ||
                          c.code.toLowerCase().includes("white") ||
                          c.code.toLowerCase().includes("ivory")
                            ? "text-ink-black"
                            : "text-white"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Action */}
          <div className="md:col-span-1 flex justify-end">
            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className="text-[10px] font-mono uppercase tracking-widest text-electric-blue hover:underline whitespace-nowrap flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

