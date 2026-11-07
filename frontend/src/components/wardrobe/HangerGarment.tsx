"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Eye } from "lucide-react";
import { WardrobeItem } from "@/lib/api";
import { getWardrobeItemTryOnStatus } from "@/features/wardrobe/tryOnMatcher";

interface HangerGarmentProps {
  item: WardrobeItem;
  onSelect: (item: WardrobeItem) => void;
  tall?: boolean;
}

export const HangerGarment: React.FC<HangerGarmentProps> = ({
  item,
  onSelect,
  tall = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const tryOnStatus = getWardrobeItemTryOnStatus(item);

  const category = (item.category || "").toLowerCase();
  const name = (item.name || "").toLowerCase();

  // Determine specialized hanger type
  const isSkirt = category.includes("skirt") || name.includes("skirt");
  const isTrouserOrJean =
    category.includes("jean") ||
    category.includes("trouser") ||
    name.includes("jean") ||
    name.includes("denim") ||
    name.includes("trouser");
  const isDress =
    tall ||
    category.includes("dress") ||
    category.includes("gown") ||
    name.includes("dress") ||
    name.includes("gown") ||
    category.includes("coat");

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col items-center cursor-pointer select-none shrink-0"
      style={{
        width: isDress ? "185px" : isTrouserOrJean ? "175px" : "170px",
      }}
    >
      {/* ========================================================
          1. REALISTIC BRASS HOOK & DARK WALNUT HANGER BODY
         ======================================================== */}
      {/* 
        The hook is positioned so its circular top apex (-top-3.5) wraps 
        directly over the horizontal brass rail pole running across the bay.
      */}
      <div
        className="w-full relative z-20 origin-top transition-transform duration-700 ease-out"
        style={{
          height: isSkirt ? "58px" : isTrouserOrJean ? "54px" : "48px",
          transform: isHovered
            ? "rotate(-1.8deg) translateY(1px)"
            : "rotate(0deg) translateY(0)",
        }}
      >
        <svg
          viewBox="0 0 180 54"
          className="w-full h-full drop-shadow-md overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Antique Brushed Brass Gradient */}
            <linearGradient id="brassHookGrad" x1="82" y1="2" x2="108" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF2CC" />
              <stop offset="25%" stopColor="#E6C65C" />
              <stop offset="60%" stopColor="#C5A059" />
              <stop offset="85%" stopColor="#8A6E30" />
              <stop offset="100%" stopColor="#523E14" />
            </linearGradient>

            {/* Hand-Carved Dark American Walnut Wood Gradient */}
            <linearGradient id="walnutWoodGrad" x1="10" y1="22" x2="170" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#24150D" />
              <stop offset="20%" stopColor="#3B2215" />
              <stop offset="50%" stopColor="#4A2C1B" />
              <stop offset="80%" stopColor="#3B2215" />
              <stop offset="100%" stopColor="#24150D" />
            </linearGradient>
          </defs>

          {/* Cast Shadow under the wooden hanger */}
          <ellipse cx="90" cy="44" rx="65" ry="3.5" fill="rgba(0,0,0,0.5)" filter="blur(2px)" />

          {/* 
            ANTIQUE BRASS HOOK
            Curves over the brass rail: loops from center up to y=3, curves around
            and tapers gracefully with an antique finial bead.
          */}
          <path
            d="M 90 26 L 90 14 C 90 6, 97 2, 102 2 C 108 2, 112 6, 112 11 C 112 15, 107 19, 103 19"
            stroke="url(#brassHookGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Hook tip finial bead */}
          <circle cx="103" cy="19" r="2" fill="#E6C65C" stroke="#7A5F23" strokeWidth="0.8" />

          {/* Solid Brass Swivel Collar Rosette */}
          <circle cx="90" cy="26" r="4" fill="url(#brassHookGrad)" stroke="#5E4717" strokeWidth="1" />
          <circle cx="90" cy="26" r="1.5" fill="#FFF3D1" />

          {/* 
            CONTOURED DARK WALNUT HANGER BODY
            Gracefully curved shoulders crafted from solid timber
          */}
          <path
            d="M 14 42 C 38 29, 72 26, 90 26 C 108 26, 142 29, 166 42 C 170 44, 164 46, 160 46 C 120 38, 60 38, 20 46 C 16 46, 10 44, 14 42 Z"
            fill="url(#walnutWoodGrad)"
            stroke="#160C07"
            strokeWidth="1.2"
          />

          {/* Polished Upper Chamfer Wood Highlight Ridge */}
          <path
            d="M 24 40 C 52 30, 78 28, 90 28 C 102 28, 128 30, 156 40"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* SPECIALIZED HANGER HARDWARE: Skirt Clips */}
          {isSkirt && (
            <g>
              {/* Left Clip */}
              <line x1="42" y1="44" x2="42" y2="52" stroke="url(#brassHookGrad)" strokeWidth="2" />
              <rect x="38" y="50" width="8" height="5" rx="1" fill="#C5A059" stroke="#5E4717" strokeWidth="0.8" />
              {/* Right Clip */}
              <line x1="138" y1="44" x2="138" y2="52" stroke="url(#brassHookGrad)" strokeWidth="2" />
              <rect x="134" y="50" width="8" height="5" rx="1" fill="#C5A059" stroke="#5E4717" strokeWidth="0.8" />
            </g>
          )}

          {/* SPECIALIZED HANGER HARDWARE: Trouser Horizontal Bar */}
          {isTrouserOrJean && (
            <g>
              <line x1="26" y1="45" x2="154" y2="45" stroke="url(#brassHookGrad)" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>

      {/* ========================================================
          2. REALISTIC CLOTHING PRESENTATION (NO WHITE CARDS)
         ======================================================== */}
      {/* 
        Garment image hangs directly beneath the wooden hanger shoulders.
        We apply a gentle radial vignette feathering around the image edges
        so the harsh rectangular card border completely vanishes, blending 
        the garment naturally into the warm dressing room walnut interior.
      */}
      <div
        className="w-full relative -mt-3.5 z-10 flex flex-col items-center transition-all duration-700 ease-out origin-top"
        style={{
          transform: isHovered
            ? "rotate(-1.8deg) translateY(-2px)"
            : "rotate(0deg) translateY(0)",
          filter: isHovered
            ? "drop-shadow(0 20px 24px rgba(0, 0, 0, 0.65))"
            : "drop-shadow(0 14px 18px rgba(0, 0, 0, 0.45))",
        }}
      >
        {/* Garment Silhouette Canvas */}
        <div
          className="relative w-full overflow-hidden transition-transform duration-500"
          style={{
            height: isDress ? "320px" : isTrouserOrJean ? "250px" : "215px",
            // Soft organic edge feathering to dissolve rectangular photography boundary
            WebkitMaskImage:
              "radial-gradient(ellipse 92% 94% at 50% 48%, black 72%, rgba(0,0,0,0.6) 88%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 92% 94% at 50% 48%, black 72%, rgba(0,0,0,0.6) 88%, transparent 100%)",
          }}
        >
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 160px, 190px"
              className="object-contain object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#A39B8F] text-xs p-3 text-center">
              <span className="font-serif italic capitalize text-sm">{item.category}</span>
              <span className="text-[10px] mt-1 text-[#736B5E]">Preserved Piece</span>
            </div>
          )}

          {/* Ambient Garment Hover Sheen Highlight */}
          <div
            className={`absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20 pointer-events-none transition-opacity duration-500 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* ========================================================
            3. RESTRAINED LUXURY LABEL & 3D READY INDICATOR
           ======================================================== */}
        {/* Discreet hanging label that reveals gracefully on hover */}
        <div className="w-full text-center mt-1.5 px-1 space-y-1">
          {/* 3D Try-On Ready Indicator (Discreet & Elegant) */}
          {tryOnStatus.isCompatible && (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1 bg-[#1A32C4]/90 text-[#F3DE8A] text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shadow-md border border-[#F3DE8A]/30 backdrop-blur-xs">
                <Sparkles className="w-2.5 h-2.5 text-[#F3DE8A]" />
                3D Ready
              </span>
            </div>
          )}

          {/* Garment Name & Color */}
          <div className="space-y-0.5">
            <h5 className="text-[11px] font-serif text-[#F4F0E8] font-normal tracking-wide line-clamp-1 group-hover:text-[#F3DE8A] transition-colors drop-shadow-xs">
              {item.name}
            </h5>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#C4B7A6] font-mono">
              <span
                className="w-2 h-2 rounded-full border border-black/30 inline-block shadow-2xs"
                style={{
                  backgroundColor:
                    item.color.toLowerCase().includes("white") || item.color.toLowerCase().includes("optic")
                      ? "#ffffff"
                      : item.color.toLowerCase().includes("black") || item.color.toLowerCase().includes("noir")
                      ? "#151515"
                      : item.color.toLowerCase().includes("navy")
                      ? "#1a2536"
                      : item.color.toLowerCase().includes("washed blue") || item.color.toLowerCase().includes("vintage")
                      ? "#5a6e85"
                      : item.color.toLowerCase().includes("charcoal") || item.color.toLowerCase().includes("grey")
                      ? "#475569"
                      : item.color.toLowerCase().includes("beige") || item.color.toLowerCase().includes("sand")
                      ? "#d2c5b0"
                      : item.color.toLowerCase().includes("olive")
                      ? "#556b2f"
                      : item.color.toLowerCase().includes("denim")
                      ? "#2b4c7e"
                      : "#8C8275",
                }}
              />
              <span className="capitalize text-[10px]">{item.color}</span>
            </div>
          </div>

          {/* Quick Inspection Prompt on Hover */}
          <div
            className={`pt-0.5 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#D4AF37] hover:underline font-mono">
              <Eye className="w-2.5 h-2.5" /> Inspect Piece
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
