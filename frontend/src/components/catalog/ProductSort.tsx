"use client";

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { CatalogSortOption } from "@/features/catalog/types";

interface ProductSortProps {
  value: CatalogSortOption;
  onChange: (sort: CatalogSortOption) => void;
}

const SORT_OPTIONS: Array<{ value: CatalogSortOption; label: string }> = [
  { value: "featured", label: "Curated Sequence" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest Editions" },
];

export default function ProductSort({ value, onChange }: ProductSortProps) {
  return (
    <div className="flex items-center space-x-2">
      <ArrowUpDown className="w-3.5 h-3.5 text-ink-black/40" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/60 hidden sm:inline">
        Sort By:
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CatalogSortOption)}
        className="bg-transparent text-xs font-mono tracking-wider uppercase text-ink-black border border-ink-black/20 rounded-none px-3 py-1.5 focus:outline-none focus:border-ink-black transition-colors cursor-pointer"
        aria-label="Sort products"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-warm-ivory text-ink-black">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
