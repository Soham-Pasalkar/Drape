import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

export default function FeaturedCollections() {
  return (
    <section id="collections" className="py-16 sm:py-24 bg-warm-ivory border-t border-ink-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Magazine Portfolio Spread Masthead */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 pb-6 border-b border-ink-black/10 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
              <span>PORTFOLIO I</span>
              <span>•</span>
              <span>ISSUE NO. 09</span>
              <span>•</span>
              <span>SPREAD 02 / 12</span>
            </div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal text-ink-black tracking-tight leading-[0.98]">
              The Four <span className="italic font-light">Silhouettes.</span>
            </h2>
          </div>
          <div className="max-w-md space-y-2">
            <p className="text-xs sm:text-sm text-ink-black/75 font-light leading-relaxed">
              A study in contemporary line, tailored volume, and material integrity. Each
              edition is designed for physical permanence and real-time digital drape simulation.
            </p>
            <div className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
              CURATED BY DRAPE ATELIER • 27 MASTER EDITIONS
            </div>
          </div>
        </div>

        {/* Asymmetrical Magazine Spread Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Dominant Left Editorial Spread: Plate 01 — New Season (7 cols) */}
          <div className="lg:col-span-7 relative group overflow-hidden bg-ink-black min-h-[540px] sm:min-h-[640px] flex flex-col justify-between border border-ink-black/10 shadow-sm">
            <Image
              src="/images/360_F_1770440943_AVX2fcHLSlqcAPX2y4TYHJAYpLx689YU.jpg"
              alt="Plate 01: The Sculpted Overcoat — Sculpted architectural suiting silhouette"
              fill
              className="object-cover object-center filter brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-700 ease-out"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            {/* Magazine Editorial Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-black/90 via-ink-black/30 to-transparent" />

            {/* Top Magazine Plate Notation */}
            <div className="relative z-10 p-6 sm:p-8 flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <span className="bg-warm-ivory text-ink-black text-[10px] font-mono uppercase tracking-widest px-3 py-1 font-semibold">
                  PLATE 01 • NEW SEASON
                </span>
                <span className="bg-electric-blue text-warm-ivory text-[9px] font-mono uppercase tracking-widest px-2 py-1 font-semibold hidden sm:inline-block">
                  LIMITED EDITION ✦
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest font-mono text-warm-ivory/80">
                18 PIECES
              </span>
            </div>

            {/* Bottom Overlaid Editorial Typography */}
            <div className="relative z-10 p-6 sm:p-10 space-y-4">
              <h3 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-normal text-warm-ivory leading-none tracking-tight">
                The Sculpted <br />
                <span className="italic font-light text-warm-ivory/95">Overcoat.</span>
              </h3>
              <p className="text-xs sm:text-sm text-warm-ivory/80 font-light max-w-lg leading-relaxed">
                Sculpted double-faced Italian virgin wool tweed pieces cut with pronounced
                drop shoulders and clean geometric drop lines against modern architectural line.
              </p>
              <div className="pt-2">
                <Link
                  href="#try-on"
                  className="inline-flex items-center text-xs uppercase tracking-widest font-semibold text-warm-ivory hover:text-acid-lime transition-colors group/link"
                >
                  <span>Discover Plate 01 Editorial</span>
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Right Editorial Storyboard Stack: Plates 02, 03 & 04 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-8">
            {/* Top Story Plate: Plate 02 — Contemporary Essentials (Landscape) */}
            <div className="relative group overflow-hidden bg-ink-black min-h-[260px] sm:min-h-[290px] flex flex-col justify-between border border-ink-black/10 shadow-sm flex-1">
              <Image
                src="/images/handsome-male-fashion-model-lightweight-jacket-male-dress-with-soft-beige-lifestyle-mens-men-portrait-fashion-male-background_171965-43734.avif"
                alt="Plate 02: Lightweight Jacket — Male fashion model in lightweight jacket on soft beige background"
                fill
                className="object-cover object-[center_30%] filter brightness-[0.96] contrast-[1.02] group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-black/75 via-transparent to-transparent" />

              {/* Top Plate Tag */}
              <div className="relative z-10 p-5 flex justify-between items-start">
                <span className="bg-warm-ivory text-ink-black text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 font-semibold">
                  PLATE 02 • CRIMSON & CHARCOAL
                </span>
                <span className="text-[10px] uppercase tracking-widest font-mono text-warm-ivory/80">
                  24 PIECES
                </span>
              </div>

              {/* Bottom Overlaid Typography */}
              <div className="relative z-10 p-5 sm:p-6 space-y-2">
                <h4 className="text-2xl sm:text-3xl font-serif font-normal text-warm-ivory tracking-tight drop-shadow-sm">
                  Lightweight Jacket
                </h4>
                <div className="pt-0.5">
                  <Link
                    href="#try-on"
                    className="inline-flex items-center text-[10px] uppercase tracking-widest font-semibold text-warm-ivory hover:text-acid-lime transition-colors drop-shadow-sm"
                  >
                    <span>View Collection</span>
                    <ArrowUpRight className="ml-1 w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Bottom Dynamic Duo: Plates 03 & 04 (Side-by-side vertical pair) */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Plate 03: Volumetric Black Blazer */}
              <div className="relative group overflow-hidden bg-ink-black aspect-[3/4] flex flex-col justify-between border border-ink-black/10 shadow-sm">
                <Image
                  src="/images/pexels-photo-11229457.avif"
                  alt="Plate 03: Volumetric Silhouette — Female model in black oversized tailored blazer"
                  fill
                  className="object-cover object-top filter brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-700 ease-out"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-black/90 via-ink-black/20 to-transparent" />

                <div className="relative z-10 p-3.5 flex justify-between items-center text-[9px] font-mono text-warm-ivory/80">
                  <span>PLATE 03</span>
                  <span>16 PIECES</span>
                </div>

                <div className="relative z-10 p-4 space-y-1">
                  <h5 className="text-base sm:text-lg font-serif font-normal text-warm-ivory leading-snug">
                    Volumetric Form
                  </h5>
                  <p className="text-[10px] text-warm-ivory/70 font-light hidden sm:block">
                    Oversized black tailored blazer silhouette.
                  </p>
                  <Link
                    href="#try-on"
                    className="text-[9px] uppercase tracking-widest font-semibold text-warm-ivory hover:text-acid-lime inline-flex items-center pt-1"
                  >
                    <span>Explore</span>
                    <ArrowUpRight className="ml-0.5 w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Plate 04: Two-Tone Trench */}
              <div className="relative group overflow-hidden bg-ink-black aspect-[3/4] flex flex-col justify-between border border-ink-black/10 shadow-sm">
                <Image
                  src="/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-1.jpg"
                  alt="Plate 04: Modern Heritage — Male model in two-tone tailored trench coat"
                  fill
                  className="object-cover object-top filter brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-700 ease-out"
                  sizes="25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-black/90 via-ink-black/20 to-transparent" />

                <div className="relative z-10 p-3.5 flex justify-between items-center text-[9px] font-mono text-warm-ivory/80">
                  <span>PLATE 04</span>
                  <span>14 PIECES</span>
                </div>

                <div className="relative z-10 p-4 space-y-1">
                  <h5 className="text-base sm:text-lg font-serif font-normal text-warm-ivory leading-snug">
                    The Dual Trench
                  </h5>
                  <p className="text-[10px] text-warm-ivory/70 font-light hidden sm:block">
                    Tan twill paired with grey herringbone lapel.
                  </p>
                  <Link
                    href="#try-on"
                    className="text-[9px] uppercase tracking-widest font-semibold text-warm-ivory hover:text-acid-lime inline-flex items-center pt-1"
                  >
                    <span>Explore</span>
                    <ArrowUpRight className="ml-0.5 w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
