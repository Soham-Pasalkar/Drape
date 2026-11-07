"use client";

import React from "react";

interface CatalogHeaderProps {
  totalCount: number;
}

export default function CatalogHeader({ totalCount }: CatalogHeaderProps) {
  return (
    <div className="border-b border-ink-black/10 pb-8 sm:pb-12 mb-8 sm:mb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-electric-blue" />
            <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60">
              AUTUMN / WINTER READY-TO-WEAR ARCHIVE
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-light tracking-tight text-ink-black">
            The Atelier Collections
          </h1>
          <p className="font-sans text-xs sm:text-sm text-ink-black/70 max-w-xl mt-3 leading-relaxed">
            Architectural tailoring, sculpted drape silhouettes, and tactile Italian textiles.
            Engineered with real-time on-device 3D spatial simulation.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="font-mono text-2xl sm:text-3xl font-light text-ink-black block leading-none">
              {totalCount.toString().padStart(2, "0")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/60">
              {totalCount === 1 ? "Edition Documented" : "Editions Documented"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
