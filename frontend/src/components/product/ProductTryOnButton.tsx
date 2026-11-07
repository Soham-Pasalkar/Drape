"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Info, ShieldCheck } from "lucide-react";
import { Product } from "@/features/catalog/types";
import { getProductTryOnStatus, buildTryOnUrl } from "@/features/catalog/utils/product-mapping";

interface ProductTryOnButtonProps {
  product: Product;
}

export default function ProductTryOnButton({ product }: ProductTryOnButtonProps) {
  const tryOnStatus = getProductTryOnStatus(product);
  const tryOnUrl = buildTryOnUrl(product);

  if (tryOnStatus.isCompatible && tryOnUrl) {
    return (
      <div className="p-4 bg-ink-black text-warm-ivory border border-ink-black/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-acid-lime animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-acid-lime font-medium">
              3D Spatial Try-On Ready
            </span>
          </div>
          <span className="text-[10px] font-mono text-warm-ivory/50 uppercase tracking-wider">
            Webcam Opt-In
          </span>
        </div>

        <p className="text-xs font-sans text-warm-ivory/80 leading-relaxed">
          Experience this garment with real-time on-device XPBD cloth dynamics and neural body tracking.
        </p>

        <Link
          href={tryOnUrl}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-electric-blue hover:bg-electric-blue/90 text-white text-xs font-mono uppercase tracking-widest transition-all shadow-md active:scale-[0.99]"
        >
          <Sparkles className="w-3.5 h-3.5 fill-white" />
          <span>Launch Spatial Atelier Studio</span>
        </Link>

        <div className="flex items-center space-x-1.5 text-[9px] font-mono text-warm-ivory/50">
          <ShieldCheck className="w-3 h-3 text-acid-lime/70" />
          <span>Zero biometric frame storage. All computer vision is executed locally on your device.</span>
        </div>
      </div>
    );
  }

  // Not compatible with current 3D asset registry
  return (
    <div className="p-4 bg-ink-black/5 border border-ink-black/15 text-ink-black space-y-2">
      <div className="flex items-center space-x-2">
        <Info className="w-3.5 h-3.5 text-ink-black/60 shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-widest font-semibold text-ink-black/80">
          3D Virtual Try-On In Development
        </span>
      </div>
      <p className="text-xs font-sans text-ink-black/70 leading-relaxed">
        {tryOnStatus.explanation}
      </p>
      <p className="text-[9px] font-mono text-ink-black/50 uppercase tracking-widest">
        Standard atelier ordering and worldwide delivery available.
      </p>
    </div>
  );
}

