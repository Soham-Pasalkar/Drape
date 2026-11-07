"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
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
      {/* Brass Hook & Wooden Hanger SVG */}
      <div className="w-full max-w-[180px] h-10 relative flex justify-center items-end z-10 transition-transform duration-500 origin-top group-hover:rotate-2">
        <svg
          viewBox="0 0 160 40"
          className="w-full h-full drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Brass Hook */}
          <path
            d="M80 8 C80 2, 88 2, 88 7 C88 12, 80 15, 80 22"
            stroke="#D4AF37"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Wood Hanger Bar */}
          <path
            d="M10 36 C35 25, 65 22, 80 22 C95 22, 125 25, 150 36 C152 37, 148 39, 145 39 C105 32, 55 32, 15 39 C12 39, 8 37, 10 36 Z"
            fill="#4A3324"
            stroke="#2B1D14"
            strokeWidth="1"
          />
          {/* Brass Pivot Ring */}
          <circle cx="80" cy="22" r="2.5" fill="#E6C65C" />
        </svg>
      </div>

      {/* Hanging Garment Body */}
      <div
        onClick={() => onSelect(item)}
        className={`w-full bg-[#FAF7F2] border border-[#E5DFD3] rounded-sm overflow-hidden shadow-sm transition-all duration-500 origin-top group-hover:shadow-md group-hover:-translate-y-0.5 ${
          compact ? "p-2 max-w-[160px]" : "p-3 max-w-[190px]"
        }`}
      >
        {/* Garment Image */}
        <div className="relative aspect-[3/4] w-full bg-[#F2EDE4] overflow-hidden rounded-xs mb-2.5">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 150px, 180px"
              className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8275] text-xs p-2 text-center bg-[#EFE9DF]">
              <span className="font-serif italic capitalize">{item.category}</span>
              <span className="text-[10px] mt-1 opacity-70">No Image</span>
            </div>
          )}

          {/* Try-on Badge */}
          {tryOnStatus.isCompatible && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <span className="inline-flex items-center gap-1 bg-[#294BFF] text-white text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                3D Try-On
              </span>
            </div>
          )}

          {/* Source Tag */}
          {item.source === "purchased" && (
            <div className="absolute bottom-1.5 left-1.5 z-10">
              <span className="bg-[#111111]/80 backdrop-blur-xs text-[#F4F0E8] text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-xs">
                DRAPE Order
              </span>
            </div>
          )}

          {/* Quick Inspector Hover Overlay */}
          <div className="absolute inset-0 bg-[#111111]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="inline-flex items-center gap-1 text-xs text-white bg-[#111111]/80 px-2 py-1 rounded-sm backdrop-blur-xs font-sans tracking-wide">
              <Eye className="w-3 h-3" /> Inspect
            </span>
          </div>
        </div>

        {/* Garment Info */}
        <div className="space-y-1 text-left">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] uppercase tracking-wider text-[#736B5E] font-medium truncate">
              {item.category}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className="w-2 h-2 rounded-full border border-black/15 inline-block"
                style={{
                  backgroundColor:
                    item.color.toLowerCase() === "white"
                      ? "#ffffff"
                      : item.color.toLowerCase() === "black" || item.color.toLowerCase() === "noir"
                      ? "#1a1a1a"
                      : item.color.toLowerCase() === "navy" || item.color.toLowerCase() === "navy blue"
                      ? "#1e293b"
                      : item.color.toLowerCase() === "washed blue"
                      ? "#64748b"
                      : item.color.toLowerCase() === "charcoal" || item.color.toLowerCase() === "grey"
                      ? "#475569"
                      : item.color.toLowerCase() === "beige" || item.color.toLowerCase() === "bone white"
                      ? "#e2d9cc"
                      : item.color.toLowerCase() === "olive" || item.color.toLowerCase() === "olive green"
                      ? "#556b2f"
                      : "#8C8275",
                }}
                title={item.color}
              />
              <span className="text-[10px] text-[#8C8275] capitalize truncate max-w-[50px]">
                {item.color}
              </span>
            </div>
          </div>

          <h4 className="text-xs font-serif font-medium text-[#111111] line-clamp-1 group-hover:text-[#294BFF] transition-colors">
            {item.name}
          </h4>

          {item.brand && (
            <p className="text-[10px] text-[#8C8275] truncate">{item.brand}</p>
          )}
        </div>
      </div>
    </div>
  );
};
