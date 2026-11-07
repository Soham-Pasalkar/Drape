"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Camera, ShieldCheck, Layers, ArrowUpRight } from "lucide-react";

export default function VirtualTryOnPreview() {
  const [activeMode, setActiveMode] = useState<"look" | "wireframe">("look");

  return (
    <section id="try-on" className="py-16 sm:py-22 bg-ink-black text-warm-ivory overflow-hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Column: Image-Led Interactive Preview Canvas (7 cols) */}
          <div className="lg:col-span-7 relative">
            <div className="relative aspect-[3/4] w-full max-w-xl mx-auto overflow-hidden border border-warm-ivory/15 bg-ink-black/40 shadow-2xl group">
              <Image
                src="/images/tryon-model.jpg"
                alt="Model in Virtual Try-On Studio Preview"
                fill
                className={`object-cover object-top transition-all duration-700 ${
                  activeMode === "wireframe"
                    ? "filter contrast-[1.25] grayscale"
                    : "filter contrast-[1.05]"
                }`}
                sizes="(max-width: 1024px) 100vw, 60vw"
              />

              {/* Simulated Geometric Drape Mesh Overlay (When Wireframe Active) */}
              {activeMode === "wireframe" && (
                <div
                  className="absolute inset-0 pointer-events-none opacity-30 animate-pulse"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #294BFF 1px, transparent 1px), linear-gradient(to bottom, #294BFF 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
              )}

              {/* Status Header Badge */}
              <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                <span className="inline-flex items-center space-x-1.5 text-[10px] uppercase tracking-widest font-mono bg-warm-ivory text-ink-black px-2.5 py-1 font-bold">
                  <Sparkles className="w-3 h-3 text-electric-blue" />
                  <span>3D AR STUDIO • 8 CALIBRATED RIGS</span>
                </span>

                {/* Interactive Mode Toggle */}
                <div className="bg-ink-black/80 backdrop-blur-md p-1 border border-warm-ivory/20 flex space-x-1 text-[10px] uppercase tracking-wider font-mono">
                  <button
                    onClick={() => setActiveMode("look")}
                    className={`px-2.5 py-1 transition-colors ${
                      activeMode === "look"
                        ? "bg-warm-ivory text-ink-black font-semibold"
                        : "text-warm-ivory/70 hover:text-warm-ivory"
                    }`}
                  >
                    Editorial
                  </button>
                  <button
                    onClick={() => setActiveMode("wireframe")}
                    className={`px-2.5 py-1 transition-colors ${
                      activeMode === "wireframe"
                        ? "bg-electric-blue text-warm-ivory font-semibold"
                        : "text-warm-ivory/70 hover:text-warm-ivory"
                    }`}
                  >
                    3D Drape Mesh
                  </button>
                </div>
              </div>

              {/* Bottom Spec Footer */}
              <div className="absolute bottom-6 left-6 right-6 z-10 p-4 bg-ink-black/80 backdrop-blur-md border border-warm-ivory/15 flex justify-between items-center text-[10px] font-mono text-warm-ivory/80">
                <span>SIMULATION TARGET: 30+ FPS</span>
                <span>VOLATILE MEMORY ONLY</span>
              </div>
            </div>
          </div>

          {/* Right Column: Experience Storytelling (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] uppercase tracking-widest text-acid-lime font-mono font-medium">
                <span>INTERACTIVE STUDIO</span>
                <span>•</span>
                <span>SPREAD 05</span>
                <span>•</span>
                <span>ISSUE NO. 09</span>
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-normal text-warm-ivory leading-tight tracking-tight">
                See How It Drapes <br />
                <span className="italic font-light">Before You Wear.</span>
              </h2>
            </div>

            <p className="text-sm text-warm-ivory/75 font-light leading-relaxed">
              DRAPE combines on-device camera tracking with high-fidelity neural image
              simulation. Experience how volume, fabric weight, and length respond to
              your natural posture—preserving your absolute privacy with zero cloud video storage.
            </p>

            <div className="space-y-4 pt-2 border-t border-warm-ivory/15">
              <div className="flex items-start space-x-3.5">
                <div className="p-2 bg-warm-ivory/10 rounded-sm text-acid-lime shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-semibold text-warm-ivory tracking-tight">
                    Live 3D Drape Mirror
                  </h4>
                  <p className="text-xs text-warm-ivory/65 font-light mt-0.5 leading-normal">
                    Real-time WebGL skeletal fitting reacting immediately to movement
                    directly inside your browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="p-2 bg-warm-ivory/10 rounded-sm text-electric-blue shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-semibold text-warm-ivory tracking-tight">
                    Neural Diffusion Previews
                  </h4>
                  <p className="text-xs text-warm-ivory/65 font-light mt-0.5 leading-normal">
                    Generate high-resolution editorial previews rendered with realistic
                    shadows, textile grain, and fold definition.
                  </p>
                </div>
              </div>
            </div>

            {/* Action CTA to Live Try-On Studio */}
            <div className="pt-2">
              <Link
                href="/try-on"
                className="inline-flex items-center space-x-2 px-6 py-3.5 bg-warm-ivory text-ink-black font-mono text-xs uppercase tracking-widest font-semibold hover:bg-electric-blue hover:text-white transition-all shadow-lg group"
              >
                <Camera className="w-4 h-4 text-electric-blue group-hover:text-white transition-colors" />
                <span>Launch Live 3D AR Mirror</span>
                <ArrowUpRight className="w-4 h-4 ml-1" />
              </Link>
            </div>

            {/* Truthfulness Notice */}
            <div className="p-4 bg-warm-ivory/5 border border-warm-ivory/10 flex items-center space-x-3 text-xs text-warm-ivory/70">
              <ShieldCheck className="w-5 h-5 text-acid-lime shrink-0" />
              <p className="text-[11px] font-light leading-relaxed">
                <strong className="font-semibold text-warm-ivory">
                  Visual Preview Boundary:
                </strong>{" "}
                Virtual try-on represents visual simulation, not a guarantee of physical
                tailored sizing or metric fit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

