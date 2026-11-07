"use client";

import React from "react";
import Image from "next/image";
import { Sparkles, Eye } from "lucide-react";
import { WardrobeItem } from "@/lib/api";
import { getWardrobeItemTryOnStatus } from "@/features/wardrobe/tryOnMatcher";

interface HangerGarmentProps {
  item: WardrobeItem;
  onSelect: (item: WardrobeItem) => void;
  compact?: boolean;
}

export const HangerGarment: React.FC<HangerGarmentProps> = ({ item, onSelect, compact = false }) => {
  const tryOnStatus = getWardrobeItemTryOnStatus(item);

  return (
    <div className="group relative flex flex-col items-center cursor-pointer select-none">
      {/* Handcrafted Walnut & Antique Brass Hanger */}
      <div className="w-full max-w-[190px] h-11 relative flex justify-center items-end z-20 transition-transform duration-700 ease-out origin-top group-hover:-rotate-2 group-hover:scale-[1.02]">
        <svg
          viewBox="0 0 180 44"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cast Shadow under hook */}
          <ellipse cx="90" cy="42" rx="40" ry="2" fill="rgba(0,0,0,0.4)" />

          {/* Antique Brass Swivel Hook */}
          <path
            d="M90 10 C90 3, 99 3, 99 9 C99 15, 90 18, 90 26"
            stroke="url(#brassHookGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Swivel Rosette Collar */}
          <circle cx="90" cy="26" r="3.5" fill="#E6C65C" stroke="#7A5F23" strokeWidth="1" />
          <circle cx="90" cy="26" r="1.5" fill="#FFF3D1" />

          {/* Hand-Carved Dark Walnut Hanger Body */}
          <path
            d="M12 40 C38 28, 72 25, 90 25 C108 25, 142 28, 168 40 C171 41.5, 166 43.5, 162 43.5 C120 36, 60 36, 18 43.5 C14 43.5, 9 41.5, 12 40 Z"
            fill="url(#walnutHangerGrad)"
            stroke="#1F120A"
            strokeWidth="1.2"
          />

          {/* Polished wood highlight ridge */}
          <path
            d="M24 38 C55 29, 80 27, 90 27 C100 27, 125 29, 156 38"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Metal Gradients */}
          <defs>
            <linearGradient id="brassHookGrad" x1="85" y1="2" x2="100" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFF2CC" />
              <stop offset="35%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#C5A059" />
              <stop offset="100%" stopColor="#7A5F23" />
            </linearGradient>
            <linearGradient id="walnutHangerGrad" x1="12" y1="25" x2="168" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#361E10" />
              <stop offset="30%" stopColor="#4E2E18" />
              <stop offset="50%" stopColor="#5E381E" />
              <stop offset="70%" stopColor="#4E2E18" />
              <stop offset="100%" stopColor="#361E10" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Hanging Garment Presentation Display */}
      <div
        onClick={() => onSelect(item)}
        className={`w-full bg-[#FAF7F2] border border-[#DDD5C7] rounded-sm overflow-hidden shadow-md transition-all duration-700 ease-out origin-top group-hover:shadow-2xl group-hover:border-[#C5A059] group-hover:-translate-y-1 ${
          compact ? "p-2 max-w-[165px]" : "p-3 max-w-[195px]"
        }`}
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
        }}
      >
        {/* Garment Photography Canvas */}
        <div className="relative aspect-[3/4] w-full bg-[#F3EFE7] overflow-hidden rounded-xs mb-3 shadow-inner">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 150px, 195px"
              className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8275] text-xs p-3 text-center bg-[#EFE9DF]">
              <span className="font-serif italic capitalize text-sm">{item.category}</span>
              <span className="text-[10px] mt-1 text-[#A39B8F]">No photo available</span>
            </div>
          )}

          {/* 3D Try-On Ready Badge */}
          {tryOnStatus.isCompatible && (
            <div className="absolute top-2 right-2 z-10">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-[#1A32C4] to-[#294BFF] text-white text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full shadow-md border border-white/20">
                <Sparkles className="w-2.5 h-2.5 text-[#F3DE8A]" />
                3D Ready
              </span>
            </div>
          )}

          {/* Luxury Atelier / Archive Tag */}
          <div className="absolute bottom-2 left-2 z-10">
            <span className="bg-[#111111]/85 backdrop-blur-xs text-[#F4F0E8] text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-xs border border-white/10">
              {item.source === "purchased" ? "DRAPE Order" : "Dressing Room"}
            </span>
          </div>

          {/* Hover Inspection Overlay */}
          <div className="absolute inset-0 bg-[#160E08]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-1.5 text-xs text-white bg-[#111111]/90 px-3 py-1.5 rounded-sm font-sans tracking-wide shadow-lg border border-[#D4AF37]/40">
              <Eye className="w-3.5 h-3.5 text-[#F3DE8A]" /> Inspect Piece
            </span>
          </div>
        </div>

        {/* Garment Attributes & Typography */}
        <div className="space-y-1.5 text-left pt-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#736B5E] font-medium truncate">
              {item.category}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block shadow-2xs"
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
                title={item.color}
              />
              <span className="text-[10px] text-[#736B5E] capitalize truncate max-w-[55px] font-medium">
                {item.color}
              </span>
            </div>
          </div>

          <h4 className="text-xs font-serif font-medium text-[#111111] line-clamp-1 group-hover:text-[#294BFF] transition-colors leading-snug">
            {item.name}
          </h4>

          {item.brand && (
            <p className="text-[10px] text-[#8C8275] tracking-wide truncate">{item.brand}</p>
          )}
        </div>
      </div>
    </div>
  );
};
