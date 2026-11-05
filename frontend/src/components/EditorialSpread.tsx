import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function EditorialSpread() {
  return (
    <section className="py-14 sm:py-20 bg-warm-ivory border-t border-ink-black/10 overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Editorial Section Masthead */}
        <div className="mb-10 sm:mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-ink-black/10 pb-5 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
              <span>FEATURE SPREAD 03</span>
              <span>•</span>
              <span>ISSUE NO. 09</span>
              <span>•</span>
              <span>BEAUTY IN THE BASICS</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-ink-black tracking-tight mt-2">
              The DRAPE Edit: <span className="italic font-light">Form in Motion.</span>
            </h2>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase tracking-widest text-ink-black/60 font-mono block">
              PHOTOGRAPHED IN PARIS & COPENHAGEN
            </span>
            <span className="text-[9px] uppercase tracking-widest font-mono text-electric-blue font-semibold">
              LIMITED EDITION ✦ 2026
            </span>
          </div>
        </div>

        {/* Asymmetrical Magazine Spread Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Dominant Vertical Image with Overlaid Quote (7 cols) */}
          <div className="lg:col-span-7 relative">
            <div className="relative aspect-square w-full overflow-hidden bg-ink-black/5 border border-ink-black/15 shadow-sm group">
              <Image
                src="/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-2.jpg"
                alt="The DRAPE Edit: Form in Motion — Suzuki Kai male editorial portrait in dark leather tailoring jacket"
                fill
                className="object-cover object-top transform group-hover:scale-102 transition-transform duration-700 ease-out"
                sizes="(max-width: 425px) 50vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-black/80 via-transparent to-transparent" />

              {/* Location Tag */}
              <div className="absolute top-5 left-5 bg-warm-ivory/95 backdrop-blur-sm px-3 py-1 border border-ink-black/10">
                <span className="text-[9px] uppercase tracking-widest font-mono text-ink-black font-semibold">
                  MILAN • STREET EDITORIAL • SPREAD 03
                </span>
              </div>

              {/* Inset Editorial Quote Box */}
              <div className="absolute bottom-8 left-8 right-8 text-warm-ivory">
                <p className="font-serif italic text-lg sm:text-xl lg:text-2xl font-light leading-snug">
                  &ldquo;A garment is never static; it is an ongoing conversation between fabric, gravity, and the body in motion.&rdquo;
                </p>
                <p className="mt-4 text-[10px] uppercase tracking-widest text-warm-ivory/70 font-mono">
                  — Atelier Director Notes • 2026
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Stacked Dynamic Editorial Visuals & Narrative (5 cols) */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-7">
            {/* Top Row: Supporting Editorial Duos */}
            <div className="grid grid-cols-2 gap-4">
              {/* Supporting 1: Female holding newspaper against pink */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-dusty-blush/20 border border-ink-black/15 group">
                <Image
                  src="/images/glamorous-woman-black-bodysuit-covering-her-eyes_197531-12938.avif"
                  alt="Editorial portrait in black bodysuit holding newspaper"
                  fill
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                />
                <div className="absolute top-2.5 left-2.5 bg-warm-ivory/90 backdrop-blur-sm px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest text-ink-black font-semibold">
                  FIG. 02 • PRINT
                </div>
              </div>

              {/* Supporting 2: Street style in motion */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink-black/5 border border-ink-black/15 group">
                <Image
                  src="/images/pexels-photo-38347378.avif"
                  alt="Street style tailored silhouette in motion with boots and slit skirt"
                  fill
                  className="object-cover object-[center_30%] group-hover:scale-105 transition-transform duration-700"
                  sizes="25vw"
                />
                <div className="absolute top-2.5 left-2.5 bg-warm-ivory/90 backdrop-blur-sm px-2 py-0.5 text-[8px] font-mono uppercase tracking-widest text-ink-black font-semibold">
                  FIG. 03 • STREET
                </div>
              </div>
            </div>

            {/* Editorial Essay & Secondary Supporting Image Row */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center space-x-4">
                {/* Supporting 3: Street-style in black top and denim */}
                <div className="relative w-24 h-28 shrink-0 overflow-hidden border border-ink-black/15 bg-ink-black/5 group">
                  <Image
                    src="/images/pexels-photo-38798854.avif"
                    alt="Female street-style in black outfit and denim"
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    sizes="96px"
                  />
                  <div className="absolute bottom-1 right-1 bg-ink-black/80 px-1 py-0.5 text-[7px] font-mono uppercase tracking-widest text-warm-ivory">
                    FIG. 04
                  </div>
                </div>

                <div className="space-y-1.5 flex-1">
                  <h3 className="text-xl sm:text-2xl font-serif font-normal text-ink-black tracking-tight leading-snug">
                    Rethinking Physical Fit Through Digital Perception.
                  </h3>
                  <p className="text-xs text-ink-black/75 font-light leading-relaxed line-clamp-3">
                    Traditional e-commerce reduces clothing to flat, static studio photography.
                    DRAPE captures the dynamic weight, flex, and flow of real textiles.
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink-black/70 font-light leading-relaxed">
                Garments respond and fall with the nuanced physics of real textiles, creating an emotional
                connection before a single stitch arrives at your door.
              </p>

              <div className="pt-2">
                <Link
                  href="#try-on"
                  className="inline-flex items-center text-xs uppercase tracking-widest font-semibold text-ink-black hover:text-electric-blue transition-colors group"
                >
                  <span>Experience The Try-On Studio</span>
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

