"use client";

import React, { useState } from "react";
import { Ruler, X, AlertCircle } from "lucide-react";

interface SizeSelectorProps {
  availableSizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  inStockSizes: string[];
  validationError?: string | null;
}

export default function SizeSelector({
  availableSizes,
  selectedSize,
  onSelectSize,
  inStockSizes,
  validationError,
}: SizeSelectorProps) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="uppercase tracking-widest text-ink-black/60">
            Select Size:
          </span>
          <span className="font-semibold text-ink-black">
            {selectedSize || "Required"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowSizeGuide(true)}
          className="text-ink-black/60 hover:text-electric-blue transition-colors flex items-center space-x-1 uppercase tracking-widest text-[10px]"
        >
          <Ruler className="w-3 h-3" />
          <span>Atelier Size Guide</span>
        </button>
      </div>

      {/* Size Pills Grid */}
      <div className="grid grid-cols-5 gap-2">
        {availableSizes.map((size) => {
          const isSelected = selectedSize === size;
          const isInStock = inStockSizes.includes(size);

          return (
            <button
              key={size}
              type="button"
              disabled={!isInStock}
              onClick={() => onSelectSize(size)}
              className={`py-3 text-xs font-mono tracking-widest uppercase border transition-all text-center relative ${
                !isInStock
                  ? "border-ink-black/10 text-ink-black/25 bg-ink-black/5 cursor-not-allowed line-through"
                  : isSelected
                  ? "bg-ink-black text-warm-ivory border-ink-black font-semibold shadow-sm"
                  : "border-ink-black/25 text-ink-black hover:border-ink-black bg-warm-ivory"
              }`}
            >
              {size}
            </button>
          );
        })}
      </div>

      {/* Validation Message */}
      {validationError && (
        <div className="flex items-center space-x-1.5 text-red-600 text-[11px] font-mono mt-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/60 backdrop-blur-sm">
          <div className="bg-warm-ivory max-w-lg w-full p-6 sm:p-8 border border-ink-black/20 shadow-2xl relative">
            <button
              onClick={() => setShowSizeGuide(false)}
              className="absolute top-4 right-4 p-2 text-ink-black/60 hover:text-ink-black"
              aria-label="Close size guide"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-1">
              SPECIFICATION ARCHIVE
            </span>
            <h3 className="font-serif text-2xl text-ink-black mb-4">
              Atelier Proportion & Sizing Standard
            </h3>
            <p className="font-sans text-xs text-ink-black/70 mb-6 leading-relaxed">
              Measurements are in centimeters and reflect garment pattern dimensions. DRAPE silhouettes
              are engineered with deliberate ease.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ink-black/20 text-[10px] uppercase tracking-wider text-ink-black/60">
                    <th className="py-2 pr-3">Size</th>
                    <th className="py-2 px-3">Chest (cm)</th>
                    <th className="py-2 px-3">Waist (cm)</th>
                    <th className="py-2 pl-3">Length (cm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-black/10">
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold">XS</td>
                    <td className="py-2.5 px-3">88 - 92</td>
                    <td className="py-2.5 px-3">72 - 76</td>
                    <td className="py-2.5 pl-3">64</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold">S</td>
                    <td className="py-2.5 px-3">94 - 98</td>
                    <td className="py-2.5 px-3">78 - 82</td>
                    <td className="py-2.5 pl-3">66</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold">M</td>
                    <td className="py-2.5 px-3">100 - 106</td>
                    <td className="py-2.5 px-3">84 - 88</td>
                    <td className="py-2.5 pl-3">68</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold">L</td>
                    <td className="py-2.5 px-3">108 - 114</td>
                    <td className="py-2.5 px-3">90 - 96</td>
                    <td className="py-2.5 pl-3">70</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-3 font-semibold">XL</td>
                    <td className="py-2.5 px-3">116 - 122</td>
                    <td className="py-2.5 px-3">98 - 104</td>
                    <td className="py-2.5 pl-3">72</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[10px] font-mono text-ink-black/50 mt-6 pt-4 border-t border-ink-black/10">
              Note: 3D preview is a visual draping simulation, not a physical fit certification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

