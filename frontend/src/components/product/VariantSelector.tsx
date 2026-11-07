"use client";

import React from "react";
import { Check } from "lucide-react";
import { ProductColor } from "@/features/catalog/types";

interface VariantSelectorProps {
  colors: ProductColor[];
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export default function VariantSelector({
  colors,
  selectedColor,
  onSelectColor,
}: VariantSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-xs font-mono">
        <span className="uppercase tracking-widest text-ink-black/60">
          Palette:
        </span>
        <span className="font-semibold text-ink-black uppercase tracking-wider">
          {selectedColor}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.name.toLowerCase();
          const isLight =
            color.code.toLowerCase() === "#ffffff" ||
            color.code.toLowerCase().includes("white") ||
            color.code.toLowerCase().includes("ivory") ||
            color.code.toLowerCase().includes("bone");

          return (
            <button
              key={color.name}
              type="button"
              onClick={() => onSelectColor(color.name)}
              className={`flex items-center space-x-2 px-3 py-1.5 border transition-all ${
                isSelected
                  ? "border-ink-black bg-ink-black/5 ring-1 ring-ink-black"
                  : "border-ink-black/20 hover:border-ink-black/60 bg-warm-ivory"
              }`}
              title={color.name}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-ink-black/20 shrink-0 inline-flex items-center justify-center"
                style={{ backgroundColor: color.code }}
              >
                {isSelected && (
                  <Check
                    className={`w-2.5 h-2.5 ${isLight ? "text-ink-black" : "text-white"}`}
                  />
                )}
              </span>
              <span className="text-[11px] font-mono tracking-wider uppercase text-ink-black">
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
