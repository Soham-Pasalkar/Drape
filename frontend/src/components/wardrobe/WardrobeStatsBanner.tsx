"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, SlidersHorizontal, Download, Plus, Layers } from "lucide-react";
import { WardrobeStats } from "@/lib/api";

interface WardrobeStatsBannerProps {
  stats: WardrobeStats | null;
  onSyncPurchases: () => void;
  isSyncing?: boolean;
}

export const WardrobeStatsBanner: React.FC<WardrobeStatsBannerProps> = ({
  stats,
  onSyncPurchases,
  isSyncing = false,
}) => {
  return (
    <div className="w-full bg-[#FAF7F2] border border-[#E5DFD3] rounded-sm p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Metrics */}
        <div className="grid grid-cols-3 gap-4 sm:gap-8 divide-x divide-[#E5DFD3]/80">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-[#736B5E] font-medium">
              Wardrobe Total
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                {stats?.total_items ?? 0}
              </span>
              <span className="text-xs text-[#8C8275] font-sans">pieces</span>
            </div>
          </div>

          <div className="pl-4 sm:pl-8">
            <span className="block text-[10px] uppercase tracking-widest text-[#736B5E] font-medium">
              3D Try-On Ready
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-serif font-medium text-[#294BFF]">
                {stats?.try_on_ready_count ?? 0}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-[#294BFF] font-medium bg-[#EEF2FF] px-1.5 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5" /> AR Active
              </span>
            </div>
          </div>

          <div className="pl-4 sm:pl-8">
            <span className="block text-[10px] uppercase tracking-widest text-[#736B5E] font-medium">
              Saved Ensembles
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-serif font-medium text-[#111111]">
                {stats?.total_outfits ?? 0}
              </span>
              <span className="text-xs text-[#8C8275] font-sans">outfits</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* DRAPE Studio CTA */}
          <Link
            href="/wardrobe/studio"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#294BFF] hover:bg-[#203ecc] text-white text-xs uppercase tracking-widest font-medium rounded-sm transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            DRAPE Studio Stylist
          </Link>

          {/* Outfits Link */}
          <Link
            href="/wardrobe/outfits"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] text-[#111111] text-xs uppercase tracking-wider font-medium rounded-sm transition-colors shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#736B5E]" />
            Outfits
          </Link>

          {/* Preferences Link */}
          <Link
            href="/wardrobe/preferences"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] text-[#111111] text-xs uppercase tracking-wider font-medium rounded-sm transition-colors shadow-xs"
            title="Configure styling preferences"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#736B5E]" />
            Preferences
          </Link>

          {/* Sync Purchases */}
          <button
            type="button"
            onClick={onSyncPurchases}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] text-[#111111] text-xs uppercase tracking-wider font-medium rounded-sm transition-colors shadow-xs disabled:opacity-50"
            title="Scan past orders and import eligible purchases"
          >
            <Download className={`w-3.5 h-3.5 text-[#736B5E] ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Orders"}
          </button>

          {/* Add Manual Item */}
          <Link
            href="/wardrobe/add"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#F4F0E8] text-xs uppercase tracking-wider font-medium rounded-sm transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Garment
          </Link>
        </div>
      </div>
    </div>
  );
};
