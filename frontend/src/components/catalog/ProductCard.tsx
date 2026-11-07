"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { Product } from "@/features/catalog/types";
import {
  getProductTryOnStatus,
  resolveCardDisplayImages,
  isColorMatch,
} from "@/features/catalog/utils/product-mapping";

interface ProductCardProps {
  product: Product;
  selectedColor?: string;
}

export default function ProductCard({ product, selectedColor }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tryOnStatus = getProductTryOnStatus(product);

  const { primaryImage, secondaryImage, hasAlternateView, matchedColor } =
    resolveCardDisplayImages(product, selectedColor);

  return (
    <div
      className="group flex flex-col bg-warm-ivory text-ink-black relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Frame */}
      <Link
        href={`/products/${product.slug}`}
        className="relative aspect-[3/4] w-full overflow-hidden bg-ink-black/5 block border border-ink-black/10"
      >
        <Image
          src={isHovered && hasAlternateView ? secondaryImage : primaryImage}
          alt={`${product.name}${matchedColor ? ` in ${matchedColor}` : ""}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover object-center transition-all duration-700 ease-out group-hover:scale-105"
          priority={product.featured}
        />

        {/* 3D Try-On Ready Pill */}
        {tryOnStatus.isCompatible ? (
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-ink-black/90 backdrop-blur-md text-acid-lime text-[9px] font-mono uppercase tracking-widest border border-acid-lime/30 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 fill-acid-lime" />
              <span>3D Try-On Ready</span>
            </span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="inline-flex items-center px-2 py-0.5 bg-ink-black/75 backdrop-blur-sm text-warm-ivory/80 text-[8px] font-mono uppercase tracking-widest border border-warm-ivory/20">
              Made to Order
            </span>
          </div>
        )}

        {/* Hover Action Pill */}
        <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-8 h-8 rounded-full bg-ink-black text-warm-ivory flex items-center justify-center shadow-lg group-hover:bg-electric-blue transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </Link>

      {/* Product Information */}
      <div className="pt-3.5 pb-2 flex flex-col flex-1">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-ink-black/60 mb-1">
          <span>{product.category}</span>
          <span>{product.sku}</span>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="font-serif text-sm sm:text-base text-ink-black font-normal hover:text-electric-blue transition-colors line-clamp-1 mb-1.5"
        >
          {product.name}
        </Link>

        <div className="flex items-baseline justify-between mt-auto pt-1">
          <span className="font-mono text-xs sm:text-sm font-medium text-ink-black">
            {product.price.formatted}
          </span>

          {/* Color Preview Swatches */}
          <div className="flex items-center space-x-1">
            {product.availableColors.map((color) => {
              const isSelected = selectedColor
                ? isColorMatch(color.name, selectedColor)
                : matchedColor
                ? isColorMatch(color.name, matchedColor)
                : false;

              return (
                <span
                  key={color.name}
                  className={`w-2.5 h-2.5 rounded-full inline-block transition-all ${
                    isSelected
                      ? "ring-2 ring-electric-blue ring-offset-1 border border-ink-black/80 scale-110"
                      : "border border-ink-black/30"
                  }`}
                  style={{ backgroundColor: color.code }}
                  title={color.name}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

