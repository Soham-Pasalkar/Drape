"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function EmptyCart() {
  return (
    <div className="py-24 text-center border border-dashed border-ink-black/20 max-w-xl mx-auto p-8 my-8">
      <ShoppingBag className="w-12 h-12 stroke-[1] text-ink-black/40 mx-auto mb-4" />
      <h2 className="font-serif text-2xl sm:text-3xl font-light text-ink-black mb-3">
        Your Atelier Bag is Currently Empty
      </h2>
      <p className="font-sans text-xs text-ink-black/60 max-w-sm mx-auto mb-8 leading-relaxed">
        Discover architectural tailoring, sculpted drape tops, and tactile Italian textiles from our
        autumn/winter ready-to-wear archive.
      </p>
      <Link
        href="/collections"
        className="inline-flex items-center space-x-2 px-8 py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors shadow-sm"
      >
        <span>Explore The Collections</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

