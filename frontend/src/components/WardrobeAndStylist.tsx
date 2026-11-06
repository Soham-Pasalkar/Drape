import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Layers, Sparkles, ArrowRight } from "lucide-react";

export default function WardrobeAndStylist() {
  return (
    <section id="wardrobe" className="py-16 sm:py-24 bg-warm-ivory border-t border-ink-black/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Section Masthead */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5 mb-12 sm:mb-16">
          <div className="flex items-center justify-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
            <span>EDITORIAL CURATION</span>
            <span>•</span>
            <span>ISSUE NO. 09</span>
            <span>•</span>
            <span>PILLARS 03 & 04</span>
          </div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal text-ink-black tracking-tight">
            Your Wardrobe, <span className="italic font-light">Evolved.</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-black/75 font-light max-w-xl mx-auto leading-relaxed">
            Move beyond transactional shopping into thoughtful wardrobe curation
            and bespoke digital styling crafted with editorial refinement.
          </p>
        </div>

        {/* 2-Column Luxury Editorial Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Column 1: The Digital Wardrobe */}
          <div className="bg-warm-ivory border border-ink-black/15 overflow-hidden flex flex-col justify-between group hover:border-ink-black/40 transition-colors duration-300 shadow-sm">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-black/5">
              <Image
                src="/images/Mens-Fashion-Photoshoot-SHARP-Magazine-September-8-2026-7.jpg"
                alt="The Digital Wardrobe Sanctuary — SHARP Magazine editorial fashion photoshoot in tailored coat and knitwear"
                fill
                className="object-cover object-[center_18%] group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-5 left-5 bg-warm-ivory/95 backdrop-blur-sm px-3.5 py-1 border border-ink-black/10">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black font-semibold">
                  PILLAR 03 • THE PERSONAL ARCHIVE
                </span>
              </div>
            </div>

            <div className="p-8 sm:p-10 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-8 h-8 flex items-center justify-center bg-ink-black text-warm-ivory rounded-none">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-serif font-normal text-ink-black tracking-tight">
                  Bring Everything You Love Into One Sanctuary.
                </h3>
                <p className="text-xs sm:text-sm text-ink-black/70 font-light leading-relaxed">
                  Digitize your existing favorites into an organized personal fashion archive.
                  Categorize pieces by season, silhouette, and occasion, and experiment with new
                  layered outfit compositions before making a single acquisition.
                </p>
              </div>

              <Link href="/wardrobe" className="pt-6 border-t border-ink-black/10 flex items-center justify-between group-hover:border-ink-black/30 transition-colors">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                  PERSONAL VAULT
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-ink-black group-hover:text-electric-blue transition-colors flex items-center">
                  <span>Explore Wardrobe Studio</span>
                  <ArrowRight className="ml-2 w-3.5 h-3.5" />
                </span>
              </Link>
            </div>
          </div>

          {/* Column 2: The AI Fashion Stylist */}
          <div id="stylist" className="bg-warm-ivory border border-ink-black/15 overflow-hidden flex flex-col justify-between group hover:border-ink-black/40 transition-colors duration-300 shadow-sm">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-black/5">
              <Image
                src="/images/young-beautiful-woman-business-suit_1303-17721.avif"
                alt="Digital Fashion Editor Editorial Curation — Female editorial portrait featuring tailored business suit and dramatic drapery"
                fill
                className="object-cover object-[center_25%] group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-5 left-5 bg-warm-ivory/95 backdrop-blur-sm px-3.5 py-1 border border-ink-black/10">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black font-semibold">
                  PILLAR 04 • DIGITAL FASHION EDITOR
                </span>
              </div>
            </div>

            <div className="p-8 sm:p-10 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-8 h-8 flex items-center justify-center bg-electric-blue text-warm-ivory rounded-none">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-serif font-normal text-ink-black tracking-tight">
                  Consult Your Neural Fashion Editor.
                </h3>
                <p className="text-xs sm:text-sm text-ink-black/70 font-light leading-relaxed">
                  An intuitive personal stylist attuned to your personal palette, proportions,
                  and calendar. Receive bespoke recommendations curated with the discerning eye
                  of an international fashion editor.
                </p>
              </div>

              <div className="pt-6 border-t border-ink-black/10 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                  NEURAL ADVISOR
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold text-ink-black group-hover:text-electric-blue transition-colors flex items-center">
                  <span>Consult Personal Stylist</span>
                  <ArrowRight className="ml-2 w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
