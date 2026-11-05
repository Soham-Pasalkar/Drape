import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ArrowRight, Eye } from "lucide-react";

export default function ShopTheLook() {
  return (
    <section className="py-14 sm:py-20 bg-warm-ivory border-t border-ink-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 pb-5 border-b border-ink-black/10 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-ink-black/60 font-mono font-medium">
              <span>LOOKBOOK SPREAD 04</span>
              <span>•</span>
              <span>ISSUE NO. 09</span>
              <span>•</span>
              <span>RADIANT & REAL</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-ink-black tracking-tight">
              Shop The Look: <span className="italic font-light">Winter Atelier.</span>
            </h2>
          </div>
          <div className="max-w-md space-y-1">
            <p className="text-xs sm:text-sm text-ink-black/75 font-light leading-relaxed">
              Cohesive styling curated by the DRAPE Atelier. Each ensemble can be
              explored as individual pieces or styled collectively in the Digital Wardrobe.
            </p>
            <div className="text-[10px] uppercase tracking-widest font-mono text-electric-blue font-semibold">
              HOLIDAY ESSENTIALS ✦ CURATED WARDROBE GUIDE
            </div>
          </div>
        </div>

        {/* Look 01: The Tailored Structured Ensemble */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch mb-0">
          {/* Main Full-Body Look Photo (7 cols) */}
          <div className="lg:col-span-7 relative group">
            <div className="relative aspect-square w-full min-h-[460px] sm:min-h-[540px] overflow-hidden bg-warm-stone/20 border border-ink-black/15 shadow-sm">
              <Image
                src="/images/look-1-main.jpg"
                alt="Look 01: The Tailored Structured Ensemble"
                fill
                className="object-cover object-[center_15%] group-hover:scale-102 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute top-5 left-5 bg-warm-ivory/95 backdrop-blur-sm px-3.5 py-1.5 border border-ink-black/10">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black font-semibold">
                  LOOK 01 • THE WINTER ATELIER
                </span>
              </div>
              <div className="absolute bottom-5 right-5 bg-ink-black/85 backdrop-blur-sm px-3 py-1 text-warm-ivory text-[9px] uppercase tracking-widest font-mono hidden sm:block">
                PARIS ATELIER • 2026
              </div>
            </div>
          </div>

          {/* Constituent Products Breakdown & Editorial Detail Inset (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* 1. Atelier Specification Masthead */}
            <div className="border-b border-ink-black/10 pb-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                <span>ENSEMBLE SPECIFICATION • AW 2026</span>
                <span className="text-electric-blue font-semibold">LOOK 01</span>
              </div>
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-normal text-ink-black tracking-tight leading-tight">
                The Structured Minimal Ensemble
              </h3>
              <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                Sculptural drop-shoulder overcoat paired with relaxed pleated trousers.
                Engineered for physical permanence and real-time digital drape simulation.
              </p>

              {/* Atelier Fabric & Palette Bar */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-ink-black/60">
                <div className="flex items-center space-x-2">
                  <span className="uppercase tracking-wider text-ink-black/40">PALETTE:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#1C1D21] border border-ink-black/20" title="Noir" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#4A4B4D] border border-ink-black/20" title="Charcoal" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#8E8B82] border border-ink-black/20" title="Heather Tweed" />
                    <span className="w-3.5 h-3.5 rounded-full bg-[#DED7CB] border border-ink-black/20" title="Warm Alabaster" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="uppercase tracking-wider text-ink-black/40">MATERIAL:</span>
                  <span className="text-ink-black font-medium">480 GSM VIRGIN WOOL</span>
                </div>
              </div>
            </div>

            {/* 2. Editorial Detail Vignette — Fabric & Silhouette Profile */}
            <div className="relative group overflow-hidden bg-warm-stone/20 border border-ink-black/15 shadow-sm">
              <div className="grid grid-cols-12 items-stretch min-h-[150px] sm:min-h-[170px]">
                {/* Image inset (5 cols) */}
                <div className="col-span-5 relative overflow-hidden bg-ink-black/5 min-h-[140px]">
                  <Image
                    src="/images/images.jpeg"
                    alt="Detail Study: Grey virgin wool tweed overcoat lapel and textural weave"
                    fill
                    className="object-cover object-[center_15%] group-hover:scale-105 transition-transform duration-700 ease-out"
                    sizes="(max-width: 1024px) 100vw, 20vw"
                  />
                  <div className="absolute top-2.5 left-2.5 bg-ink-black/85 text-warm-ivory text-[8px] font-mono uppercase tracking-widest px-2 py-0.5">
                    DETAIL STUDY
                  </div>
                </div>

                {/* Editorial commentary (7 cols) */}
                <div className="col-span-7 p-3.5 sm:p-5 flex flex-col justify-between bg-warm-ivory/60">
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="text-[9px] uppercase tracking-widest font-mono text-ink-black/50">
                      ATELIER NOTES • 01
                    </div>
                    <p className="text-[11px] sm:text-xs font-serif italic text-ink-black leading-snug">
                      &ldquo;A clean architectural shoulder cut to fall past the knee, balancing structure and motion.&rdquo;
                    </p>
                  </div>
                  <div className="pt-2 border-t border-ink-black/10 flex flex-wrap items-center justify-between gap-1 text-[8px] sm:text-[9px] font-mono text-ink-black/60 uppercase tracking-wider">
                    <span>CUT: RELAXED OVERSIZED</span>
                    <span className="text-electric-blue font-semibold">BIELLA, ITALY</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Constituent Items (The 2 product cards) */}
            <div className="space-y-3">
              {/* Constituent Item 1 */}
              <div className="p-3.5 sm:p-4 bg-warm-ivory border border-ink-black/15 flex items-center justify-between hover:border-ink-black transition-colors duration-200 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="relative w-14 h-16 sm:w-16 sm:h-20 bg-warm-stone/20 overflow-hidden border border-ink-black/10 shrink-0">
                    <Image
                      src="/images/look-1-item1.jpg"
                      alt="Heavyweight Wool Overcoat"
                      fill
                      className="object-cover object-center"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-sans font-semibold text-ink-black tracking-tight">
                      Double-Faced Wool Coat
                    </p>
                    <p className="text-[11px] text-ink-black/60 font-mono mt-0.5">
                      Noir • 100% Italian Virgin Wool
                    </p>
                    <p className="text-xs font-mono font-medium text-ink-black mt-1">
                      $980 USD
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Preview in Try-On Studio"
                  className="p-2 border border-ink-black/20 hover:bg-electric-blue hover:text-warm-ivory hover:border-electric-blue transition-colors rounded-none"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Constituent Item 2 */}
              <div className="p-3.5 sm:p-4 bg-warm-ivory border border-ink-black/15 flex items-center justify-between hover:border-ink-black transition-colors duration-200 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="relative w-14 h-16 sm:w-16 sm:h-20 bg-warm-stone/20 overflow-hidden border border-ink-black/10 shrink-0">
                    <Image
                      src="/images/look-1-item2.jpg"
                      alt="Pleated Wide-Leg Trouser"
                      fill
                      className="object-cover object-center"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-sans font-semibold text-ink-black tracking-tight">
                      Wide-Leg Pleated Trouser
                    </p>
                    <p className="text-[11px] text-ink-black/60 font-mono mt-0.5">
                      Charcoal • High-Waisted Tailored Cut
                    </p>
                    <p className="text-xs font-mono font-medium text-ink-black mt-1">
                      $440 USD
                    </p>
                  </div>
                </div>
                <button
                  aria-label="Preview in Try-On Studio"
                  className="p-2 border border-ink-black/20 hover:bg-electric-blue hover:text-warm-ivory hover:border-electric-blue transition-colors rounded-none"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4. Full Ensemble CTA & Editorial Metadata */}
            <div className="pt-1 space-y-2.5">
              <Link
                href="#try-on"
                className="w-full inline-flex justify-center items-center py-3.5 sm:py-4 bg-ink-black text-warm-ivory text-xs uppercase tracking-widest font-semibold hover:bg-electric-blue transition-colors duration-300 group shadow-md"
              >
                <span>Preview Ensemble in Studio</span>
                <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center justify-between text-[10px] text-ink-black/50 font-mono uppercase tracking-wider">
                <span>MILAN & PARIS ATELIER</span>
                <span>COMPLIMENTARY ALTERATIONS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

