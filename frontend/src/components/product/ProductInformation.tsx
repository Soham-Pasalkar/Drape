"use client";

import React, { useState } from "react";
import { ChevronDown, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { Product } from "@/features/catalog/types";

interface ProductInformationProps {
  product: Product;
}

export default function ProductInformation({ product }: ProductInformationProps) {
  const [openSection, setOpenSection] = useState<string | null>("fabric");

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="border-b border-ink-black/10 pb-6">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-ink-black/60 mb-2">
          <span>{product.brand}</span>
          <span>{product.sku}</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl text-ink-black font-light mb-3">
          {product.name}
        </h1>

        <div className="flex items-baseline space-x-3">
          <span className="font-mono text-xl sm:text-2xl text-ink-black font-medium">
            {product.price.formatted}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-black/50">
            {product.price.currency} • Complimentary Global Courier
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3 font-sans text-xs sm:text-sm text-ink-black/80 leading-relaxed">
        <p className="font-medium text-ink-black">{product.shortDescription}</p>
        <p className="text-ink-black/70">{product.description}</p>
      </div>

      {/* Accordions */}
      <div className="border-t border-b border-ink-black/10 divide-y divide-ink-black/10 text-xs font-mono">
        {/* Fabric & Construction */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("fabric")}
            className="w-full py-4 flex items-center justify-between text-left uppercase tracking-widest text-ink-black hover:text-electric-blue transition-colors"
          >
            <span>Material & Craftsmanship</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                openSection === "fabric" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "fabric" && (
            <div className="pb-4 text-xs font-sans text-ink-black/70 space-y-2 leading-relaxed">
              <p>
                <strong className="font-mono text-[11px] uppercase tracking-wider text-ink-black">
                  Composition:
                </strong>{" "}
                {product.material}
              </p>
              <p>
                Developed in collaboration with specialized Italian and Japanese partner mills.
                Sustainably dyed and finished under strict low-water certifications.
              </p>
            </div>
          )}
        </div>

        {/* Care Guidelines */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("care")}
            className="w-full py-4 flex items-center justify-between text-left uppercase tracking-widest text-ink-black hover:text-electric-blue transition-colors"
          >
            <span>Care Instructions</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                openSection === "care" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "care" && (
            <div className="pb-4 text-xs font-sans text-ink-black/70 space-y-1.5 leading-relaxed">
              <ul className="list-disc list-inside space-y-1 text-ink-black/80">
                {product.careInstructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Shipping & Returns */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("shipping")}
            className="w-full py-4 flex items-center justify-between text-left uppercase tracking-widest text-ink-black hover:text-electric-blue transition-colors"
          >
            <span>Delivery & Returns</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                openSection === "shipping" ? "rotate-180" : ""
              }`}
            />
          </button>
          {openSection === "shipping" && (
            <div className="pb-4 text-xs font-sans text-ink-black/70 space-y-2 leading-relaxed">
              <div className="flex items-start space-x-2">
                <Truck className="w-4 h-4 text-ink-black/60 shrink-0 mt-0.5" />
                <span>Complimentary express courier delivery on all orders over $500.</span>
              </div>
              <div className="flex items-start space-x-2">
                <RotateCcw className="w-4 h-4 text-ink-black/60 shrink-0 mt-0.5" />
                <span>14-day archival returns for unworn pieces in original packaging.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimers & Integrity */}
      <div className="pt-2 text-[10px] font-mono text-ink-black/50 space-y-1 leading-normal">
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3 h-3 text-ink-black/60 shrink-0" />
          <span>DRAPE Atelier Demonstration Edition • Authentic Pattern Archive</span>
        </div>
        <p>
          Notice: 3D interactive preview represents visual drape simulation and does not substitute
          for tailored bespoke physical measurement.
        </p>
      </div>
    </div>
  );
}
