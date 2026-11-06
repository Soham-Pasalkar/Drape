"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, Sparkles, SlidersHorizontal } from "lucide-react";
import { GarmentMetadata, GarmentCategory } from "@/lib/ar/types";
import { getAllGarments } from "@/lib/ar/garment-registry";

interface GarmentSelectorProps {
  selectedGarmentId: string;
  onSelectGarment: (garment: GarmentMetadata) => void;
  className?: string;
}

export default function GarmentSelector({
  selectedGarmentId,
  onSelectGarment,
  className = "",
}: GarmentSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<GarmentCategory | "all">("all");
  const allGarments = getAllGarments();

  const filteredGarments =
    activeCategory === "all"
      ? allGarments
      : allGarments.filter((g) => g.category === activeCategory);

  const categories: Array<{ id: GarmentCategory | "all"; label: string }> = [
    { id: "all", label: "All Pieces" },
    { id: "tops", label: "Atelier Tops" },
    { id: "skirts", label: "Skirts" },
    { id: "dresses", label: "Column Gowns" },
  ];

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {/* Category Tabs */}
      <div className="flex items-center justify-between border-b border-warm-ivory/15 pb-2">
        <div className="flex space-x-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono transition-all rounded-sm whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-warm-ivory text-ink-black font-semibold shadow-sm"
                  : "text-warm-ivory/60 hover:text-warm-ivory hover:bg-warm-ivory/10"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-wider text-warm-ivory/50">
          {filteredGarments.length} CALIBRATED 3D RIGS
        </span>
      </div>

      {/* Garments Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredGarments.map((garment) => {
          const isSelected = garment.id === selectedGarmentId;

          return (
            <button
              key={garment.id}
              onClick={() => onSelectGarment(garment)}
              className={`group relative flex flex-col text-left p-2.5 border transition-all duration-200 bg-ink-black/40 backdrop-blur-sm rounded-sm ${
                isSelected
                  ? "border-electric-blue ring-1 ring-electric-blue bg-ink-black/70 shadow-lg"
                  : "border-warm-ivory/15 hover:border-warm-ivory/40 hover:bg-ink-black/60"
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[4/5] w-full bg-ink-black/80 overflow-hidden mb-2 border border-warm-ivory/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={garment.thumbnailPath}
                  alt={garment.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />

                {/* Selected Indicator Badge */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 p-1 bg-electric-blue text-white rounded-full shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* Category Pill */}
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-ink-black/80 backdrop-blur-sm text-[8px] font-mono uppercase tracking-widest text-warm-ivory/80 border border-warm-ivory/15">
                  {garment.category}
                </div>
              </div>

              {/* Garment Details */}
              <div className="space-y-1 w-full">
                <h4 className="font-serif text-xs font-normal text-warm-ivory group-hover:text-electric-blue transition-colors line-clamp-1">
                  {garment.name}
                </h4>

                <p className="text-[10px] text-warm-ivory/60 font-mono tracking-tight line-clamp-1">
                  {garment.dimensions.chestCm
                    ? `Chest: ${garment.dimensions.chestCm}cm`
                    : garment.dimensions.waistCm
                    ? `Waist: ${garment.dimensions.waistCm}cm`
                    : `Length: ${garment.dimensions.lengthCm}cm`}{" "}
                  • L: {garment.dimensions.lengthCm}cm
                </p>

                <div className="flex items-center space-x-1.5 pt-1">
                  <span
                    className="w-2 h-2 rounded-full border border-warm-ivory/30"
                    style={{ backgroundColor: garment.material.color }}
                  />
                  <span className="text-[9px] text-warm-ivory/50 font-mono truncate uppercase">
                    PBR {Math.round((1 - garment.material.roughness) * 100)}% Sheen
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

