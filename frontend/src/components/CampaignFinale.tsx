import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CampaignFinale() {
  return (
    <section className="relative w-full bg-ink-black text-warm-ivory py-24 sm:py-32 overflow-hidden">
      {/* Background Campaign Finale Visual */}
      <div className="absolute inset-0 w-full h-full bg-deep-espresso">
        <Image
          src="/images/portrait-young-happy-woman-studio_1303-13802.avif"
          alt="DRAPE Global Fashion Campaign Finale — Studio tailoring against rich crimson and espresso tones"
          fill
          className="object-cover object-[center_28%] filter brightness-[0.42] contrast-[1.15]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-espresso via-charcoal/60 to-deep-espresso/90" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-acid-lime font-mono">
          <span>ATELIER INVITATION</span>
          <span>•</span>
          <span>CLOSING SPREAD</span>
          <span>•</span>
          <span>ISSUE NO. 09</span>
        </div>

        <h2 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-serif font-normal text-warm-ivory leading-[0.98] tracking-tight">
          Step Into The Future <br />
          <span className="italic font-light text-warm-ivory/95">of Dress.</span>
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-warm-ivory/80 max-w-xl mx-auto font-light leading-relaxed">
          DRAPE invites you to experience digital luxury fashion without compromise.
          Be among the first to preview the new autumn collection in our interactive studio.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="#collections"
            className="w-full sm:w-auto px-10 py-4 bg-warm-ivory text-ink-black text-xs uppercase tracking-widest font-semibold hover:bg-electric-blue hover:text-warm-ivory transition-all duration-300 shadow-xl"
          >
            Explore The Full Edit
          </Link>
          <Link
            href="#try-on"
            className="w-full sm:w-auto px-8 py-4 border border-warm-ivory/40 text-warm-ivory text-xs uppercase tracking-widest font-medium hover:border-warm-ivory hover:bg-warm-ivory/10 backdrop-blur-sm transition-all duration-300"
          >
            Access Try-On Studio
          </Link>
        </div>

        <div className="pt-8 text-[10px] uppercase tracking-widest text-warm-ivory/50 font-mono">
          PARIS • MILAN • NEW YORK • TOKYO ✦ ISSUE NO. 09 ✦ 2026
        </div>
      </div>
    </section>
  );
}
