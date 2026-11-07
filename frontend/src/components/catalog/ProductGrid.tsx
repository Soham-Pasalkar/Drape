"use client";

import React from "react";
import { ShoppingBag, RefreshCw } from "lucide-react";
import { Product } from "@/features/catalog/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  selectedColor?: string;
  onResetFilters?: () => void;
}

export default function ProductGrid({
  products,
  selectedColor,
  onResetFilters,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-24 text-center border border-dashed border-ink-black/20 p-8 max-w-lg mx-auto my-12">
        <ShoppingBag className="w-10 h-10 stroke-[1.2] text-ink-black/40 mx-auto mb-3" />
        <h3 className="font-serif text-2xl font-light text-ink-black mb-2">
          No Garments Match Current Criteria
        </h3>
        <p className="font-sans text-xs text-ink-black/60 max-w-sm mx-auto mb-6 leading-relaxed">
          Try expanding your category, size, or color selection, or clear your keyword search
          to inspect the complete autumn/winter archive.
        </p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          selectedColor={selectedColor}
        />
      ))}
    </div>
  );
}

