"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles, Trash2, Calendar, ShieldCheck, Tag, ArrowRight } from "lucide-react";
import { WardrobeItem } from "@/lib/api";
import { getWardrobeItemTryOnStatus } from "@/features/wardrobe/tryOnMatcher";

interface GarmentDetailModalProps {
  item: WardrobeItem | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export const GarmentDetailModal: React.FC<GarmentDetailModalProps> = ({
  item,
  onClose,
  onDelete,
  isDeleting = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const tryOnStatus = getWardrobeItemTryOnStatus(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl bg-[#FAF7F2] border border-[#E5DFD3] shadow-2xl rounded-sm overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-[#736B5E] hover:text-[#111111] hover:bg-black/5 rounded-full transition-colors"
          aria-label="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Garment Imagery */}
        <div className="relative w-full md:w-1/2 aspect-[3/4] md:aspect-auto md:min-h-[460px] bg-[#F2EDE4] overflow-hidden shrink-0">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#8C8275] p-6 text-center">
              <span className="font-serif italic text-lg capitalize">{item.category}</span>
              <span className="text-xs mt-2 text-[#A39B8F]">No photo available</span>
            </div>
          )}

          {tryOnStatus.isCompatible && (
            <div className="absolute top-4 left-4 z-10">
              <span className="inline-flex items-center gap-1.5 bg-[#294BFF] text-white text-xs uppercase tracking-widest font-medium px-2.5 py-1 rounded-full shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                3D Try-On Ready
              </span>
            </div>
          )}
        </div>

        {/* Right: Garment Attributes & Actions */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-widest text-[#736B5E] font-medium">
                  {item.category}
                </span>
                <span className="text-xs text-[#C5BDB0]">•</span>
                <span className="text-xs uppercase tracking-widest text-[#736B5E]">
                  {item.source === "purchased" ? "DRAPE Order" : "Personal Closet"}
                </span>
              </div>
              <h3 className="text-2xl font-serif font-medium text-[#111111] leading-tight">
                {item.name}
              </h3>
              {item.brand && (
                <p className="text-sm text-[#736B5E] mt-1 font-sans">{item.brand}</p>
              )}
            </div>

            {/* Attributes Grid */}
            <div className="grid grid-cols-2 gap-3.5 py-4 border-y border-[#E5DFD3]/80 text-xs">
              <div>
                <span className="block text-[#8C8275] uppercase tracking-wider text-[10px] mb-1">
                  Color
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-black/15 inline-block"
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
                          : item.color.toLowerCase() === "beige"
                          ? "#e2d9cc"
                          : item.color.toLowerCase() === "olive"
                          ? "#556b2f"
                          : "#8C8275",
                    }}
                  />
                  <span className="capitalize font-medium text-[#111111]">{item.color}</span>
                </div>
              </div>

              {item.size && (
                <div>
                  <span className="block text-[#8C8275] uppercase tracking-wider text-[10px] mb-1">
                    Size
                  </span>
                  <span className="font-medium text-[#111111] uppercase">{item.size}</span>
                </div>
              )}

              {item.material && (
                <div className="col-span-2">
                  <span className="block text-[#8C8275] uppercase tracking-wider text-[10px] mb-1">
                    Fabric & Material
                  </span>
                  <span className="text-[#333333] font-sans">{item.material}</span>
                </div>
              )}

              {item.occasion && (
                <div>
                  <span className="block text-[#8C8275] uppercase tracking-wider text-[10px] mb-1">
                    Occasion
                  </span>
                  <span className="capitalize font-medium text-[#111111]">{item.occasion}</span>
                </div>
              )}

              {item.season && (
                <div>
                  <span className="block text-[#8C8275] uppercase tracking-wider text-[10px] mb-1">
                    Season
                  </span>
                  <span className="capitalize font-medium text-[#111111]">{item.season}</span>
                </div>
              )}
            </div>

            {/* Description or Notes */}
            {item.description && (
              <p className="text-xs text-[#5C5549] leading-relaxed italic font-serif">
                &ldquo;{item.description}&rdquo;
              </p>
            )}

            {/* Try-On Banner */}
            {tryOnStatus.isCompatible ? (
              <div className="p-3.5 bg-[#EEF2FF] border border-[#294BFF]/20 rounded-sm">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#294BFF] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-[#111111]">Virtual 3D Try-On Available</p>
                    <p className="text-[#4A5568] text-[11px] mt-0.5">
                      This piece is verified against our real-time physical cloth simulation engine.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-[#8C8275]">
                3D virtual try-on is currently in development for this silhouette.
              </p>
            )}
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-6 mt-6 border-t border-[#E5DFD3]">
            {tryOnStatus.isCompatible && tryOnStatus.tryOnUrl && (
              <Link
                href={tryOnStatus.tryOnUrl}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#294BFF] hover:bg-[#203ecc] text-white text-xs uppercase tracking-widest font-medium rounded-sm transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Try On In 3D Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 text-xs text-[#A34235] hover:text-[#80251A] transition-colors py-1.5 px-2 -ml-2 rounded-sm disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? "Removing..." : "Remove from Wardrobe"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[#736B5E] hover:text-[#111111] uppercase tracking-wider py-1.5 px-3"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
