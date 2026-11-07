"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, ZoomIn } from "lucide-react";
import { ProductImage } from "@/features/catalog/types";

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  isTryOnCompatible: boolean;
}

export default function ProductGallery({
  images,
  productName,
  isTryOnCompatible,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeImage = images[selectedIndex] || {
    id: "fallback",
    url: "/images/collection-essentials.jpg",
    alt: productName,
  };

  return (
    <div className="space-y-4">
      {/* Main Image Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink-black/5 border border-ink-black/10">
        <Image
          src={activeImage.url}
          alt={activeImage.alt || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center transition-all duration-500 ease-out"
        />

        {/* 3D Ready Badge */}
        {isTryOnCompatible && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center space-x-1 px-3 py-1 bg-ink-black/90 backdrop-blur-md text-acid-lime text-[10px] font-mono uppercase tracking-widest border border-acid-lime/30 shadow-md">
              <Sparkles className="w-3 h-3 fill-acid-lime" />
              <span>3D Virtual Try-On Ready</span>
            </span>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
          <span className="w-8 h-8 rounded-full bg-ink-black/60 text-warm-ivory backdrop-blur-sm flex items-center justify-center">
            <ZoomIn className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex items-center space-x-3 overflow-x-auto pb-2">
          {images.map((img, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={img.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-20 aspect-[3/4] overflow-hidden border transition-all shrink-0 ${
                  isSelected
                    ? "border-ink-black ring-1 ring-ink-black"
                    : "border-ink-black/20 opacity-70 hover:opacity-100"
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || `${productName} view ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover object-center"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
