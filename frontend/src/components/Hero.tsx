import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full bg-warm-ivory overflow-hidden">
      {/* Magazine-Cover Hero Canvas */}
      <div className="relative min-h-[85vh] sm:min-h-[90vh] w-full flex items-end">
        {/* Dominant Editorial Campaign Photograph */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/images/fashion-69822ecb7c423.avif"
            alt="DRAPE Autumn/Winter 2026 Editorial Campaign — The Architecture of Silhouette"
            fill
            priority
            className="object-cover object-top filter brightness-[0.95] contrast-[1.05]"
            sizes="100vw"
          />
          {/* Subtle Editorial Gradient Overlay for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-black/80 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-black/40 via-transparent to-transparent hidden md:block" />
        </div>

        {/* Magazine Cover Text & Headline Overlay */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pb-14 sm:pb-20 pt-28 sm:pt-36">
          <div className="max-w-3xl space-y-6">
            {/* Editorial Header Badge */}
            <div className="inline-flex items-center space-x-3 text-warm-ivory/90 text-[10px] sm:text-xs uppercase tracking-editorial font-medium border-b border-warm-ivory/30 pb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-acid-lime animate-pulse" />
              <span>Campaign No. 01 • Autumn / Winter 2026</span>
            </div>

            {/* Haute Couture Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-normal text-warm-ivory tracking-tight leading-[1.02]">
              The Architecture <br />
              <span className="italic font-light text-warm-ivory/95">of Silhouette.</span>
            </h1>

            {/* Editorial Narrative */}
            <p className="text-sm sm:text-base md:text-lg text-warm-ivory/80 font-light max-w-xl leading-relaxed">
              Where contemporary luxury tailoring meets next-generation digital drape.
              Discover garments crafted with timeless presence and preview their form
              before making them your own.
            </p>

            {/* Call To Action Controls */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3.5 sm:space-y-0 sm:space-x-5">
              <Link
                href="#collections"
                className="inline-flex justify-center items-center px-9 py-4 bg-warm-ivory text-ink-black text-xs uppercase tracking-widest font-semibold hover:bg-electric-blue hover:text-warm-ivory transition-all duration-300 group shadow-lg"
              >
                <span>Discover The Collection</span>
                <ArrowRight className="ml-2.5 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#try-on"
                className="inline-flex justify-center items-center px-8 py-4 border border-warm-ivory/40 text-warm-ivory text-xs uppercase tracking-widest font-medium hover:border-warm-ivory hover:bg-warm-ivory/10 backdrop-blur-sm transition-all duration-300 group"
              >
                <Sparkles className="mr-2 w-3.5 h-3.5 text-acid-lime group-hover:rotate-12 transition-transform" />
                <span>Try-On Studio Preview</span>
              </Link>
            </div>
          </div>

          {/* Bottom Editorial Meta Bar */}
          <div className="mt-10 sm:mt-12 pt-5 border-t border-warm-ivory/20 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] uppercase tracking-wider text-warm-ivory/60 font-mono gap-2">
            <span>LOOK 01 • SCULPTURAL TAILORED TRENCH ENSEMBLE</span>
            <span>PARIS ATELIER • COMPLIMENTARY GLOBAL DELIVERY</span>
          </div>
        </div>
      </div>
    </section>
  );
}
