"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DoorOpen,
  DoorClosed,
  Sparkles,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { WardrobeItem } from "@/lib/api";
import { HangerGarment } from "./HangerGarment";

interface CupboardClosetProps {
  items: WardrobeItem[];
  onSelectItem: (item: WardrobeItem) => void;
  onOpenAddModal?: () => void;
}

type CompartmentFilter = "all" | "tops" | "bottoms" | "dresses" | "drawers";

export const CupboardCloset: React.FC<CupboardClosetProps> = ({
  items,
  onSelectItem,
}) => {
  const [doorsOpen, setDoorsOpen] = useState<boolean>(true);
  const [activeCompartment, setActiveCompartment] = useState<CompartmentFilter>("all");
  const [drawersOpen, setDrawersOpen] = useState<boolean>(false);

  // Group garments by physical armoire compartments
  const tops = items.filter((it) => {
    const c = (it.category || "").toLowerCase();
    const n = (it.name || "").toLowerCase();
    return (
      c.includes("t-shirt") ||
      c.includes("top") ||
      c.includes("shirt") ||
      n.includes("tee") ||
      n.includes("crew") ||
      n.includes("top") ||
      n.includes("shirt")
    );
  });

  const bottoms = items.filter((it) => {
    const c = (it.category || "").toLowerCase();
    const n = (it.name || "").toLowerCase();
    return (
      c.includes("jean") ||
      c.includes("trouser") ||
      c.includes("skirt") ||
      c.includes("bottom") ||
      n.includes("jean") ||
      n.includes("trouser") ||
      n.includes("skirt") ||
      n.includes("denim")
    );
  });

  const dresses = items.filter((it) => {
    const c = (it.category || "").toLowerCase();
    const n = (it.name || "").toLowerCase();
    return (
      c.includes("dress") ||
      n.includes("dress") ||
      c.includes("coat") ||
      n.includes("coat") ||
      c.includes("gown") ||
      n.includes("gown")
    );
  });

  const drawerItems = items.filter((it) => {
    const c = (it.category || "").toLowerCase();
    const n = (it.name || "").toLowerCase();
    return (
      c.includes("accessori") ||
      c.includes("knit") ||
      c.includes("sweater") ||
      n.includes("knit") ||
      n.includes("scarf") ||
      n.includes("belt") ||
      n.includes("cardigan")
    );
  });

  // Items not caught above default to tops rail
  const classifiedIds = new Set([
    ...tops.map((i) => i.id),
    ...bottoms.map((i) => i.id),
    ...dresses.map((i) => i.id),
    ...drawerItems.map((i) => i.id),
  ]);
  const others = items.filter((it) => !classifiedIds.has(it.id));
  const activeTops = [...tops, ...others];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* ========================================================
          1. LUXURY ATELIER CONTROL & AMBIENCE TOOLBAR
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F2EA] border border-[#DDD5C7] p-2.5 sm:p-3 rounded-xs shadow-xs">
        {/* Compartment Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-[#8C8275] uppercase tracking-widest text-[10px] font-mono font-medium mr-1 shrink-0">
            Armoire Zone:
          </span>
          {(
            [
              { id: "all", label: `Full Armoire (${items.length})` },
              { id: "tops", label: `Upper Rail (${activeTops.length})` },
              { id: "bottoms", label: `Lower Rail & Shelves (${bottoms.length})` },
              { id: "dresses", label: `Tall Bay (${dresses.length})` },
              { id: "drawers", label: `Walnut Drawers (${drawerItems.length})` },
            ] as const
          ).map((zone) => (
            <button
              key={zone.id}
              onClick={() => {
                setActiveCompartment(zone.id);
                if (!doorsOpen) setDoorsOpen(true);
                if (zone.id === "drawers") setDrawersOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xs transition-all uppercase tracking-wider text-[11px] font-medium shrink-0 ${
                activeCompartment === zone.id
                  ? "bg-[#28180E] text-[#F3DE8A] shadow-xs border border-[#D4AF37]/40"
                  : "text-[#5C5549] hover:bg-[#EAE4D7] border border-transparent"
              }`}
            >
              {zone.label}
            </button>
          ))}
        </div>

        {/* Master Double-Door Trigger Button */}
        <button
          onClick={() => setDoorsOpen(!doorsOpen)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#28180E] hover:bg-[#382214] border border-[#D4AF37]/50 rounded-xs text-[11px] uppercase tracking-widest text-[#F3DE8A] font-medium transition-all shadow-xs ml-auto"
        >
          {doorsOpen ? (
            <>
              <DoorClosed className="w-3.5 h-3.5 text-[#E6C65C]" />
              <span>Close Armoire</span>
            </>
          ) : (
            <>
              <DoorOpen className="w-3.5 h-3.5 text-[#E6C65C]" />
              <span>Open Armoire</span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================
          2. THE HANDCRAFTED AMERICAN WALNUT ARMOIRE
         ======================================================== */}
      <div className="relative w-full armoire-cabinet-shadow rounded-sm select-none">
        {/* ----------------------------------------------------
            A. STEPPED TOP CORNICE & CROWN MOULDING
           ---------------------------------------------------- */}
        <div className="relative z-30">
          {/* Top Overhanging Cap */}
          <div className="h-3 sm:h-4 w-[calc(100%+16px)] -ml-2 rounded-t-sm wood-walnut-horizontal border-t border-[#6B4226] border-b border-[#120A05] armoire-cornice relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-black/60" />
          </div>

          {/* Stepped Moulding Frieze */}
          <div className="h-8 sm:h-10 w-full wood-walnut-frame border-b border-[#120A05] flex items-center justify-between px-4 sm:px-8 relative shadow-md">
            {/* Left Brass Corner Bracket */}
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#F3DE8A] to-[#8A6E30] shadow-xs border border-[#4E3914]" />
              <div className="w-6 h-0.5 bg-gradient-to-r from-[#D4AF37] to-transparent" />
            </div>

            {/* Centered Engraved Antique Brass Atelier Plaque */}
            <div className="brass-metallic-sheen px-4 sm:px-6 py-1 rounded-xs border border-[#6E551B] shadow-md flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] font-serif font-semibold text-[#28180E]">
                DRAPE • Ébénisterie Privée • Atelier Haute Couture
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
            </div>

            {/* Right Brass Corner Bracket */}
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-6 h-0.5 bg-gradient-to-l from-[#D4AF37] to-transparent" />
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-[#F3DE8A] to-[#8A6E30] shadow-xs border border-[#4E3914]" />
            </div>
          </div>

          {/* Astragal Recessed Shadow Band */}
          <div className="h-1.5 w-full bg-[#140C07] shadow-inner" />
        </div>

        {/* ----------------------------------------------------
            B. MAIN CABINET HOUSING (Pilasters, Doors & Interior)
           ---------------------------------------------------- */}
        <div className="relative flex min-h-[640px] sm:min-h-[720px] bg-[#1A0F0A] border-x-4 border-[#28180E] overflow-hidden">
          {/* LEFT FLUTED PILASTER / COLUMN */}
          <div className="w-7 sm:w-11 shrink-0 wood-walnut-vertical relative border-r-2 border-[#120A05] flex flex-col justify-between py-6 z-20 shadow-lg">
            {/* Carved Capital */}
            <div className="h-5 w-full bg-gradient-to-b from-[#4A2E1B] to-[#28180E] border-y border-[#6B4226]/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]/70 shadow-2xs" />
            </div>

            {/* Fluted Vertical Shaft with Antique Brass Strap Hinges */}
            <div className="flex-1 relative flex flex-col justify-around py-8 items-center">
              {/* Upper Strap Hinge */}
              <div className="w-4 sm:w-6 h-10 brass-hinge-strap rounded-xs border border-[#5E4717] flex flex-col items-center justify-around py-1 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
                <div className="w-1 h-3 bg-[#523E14] rounded-2xs" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
              </div>

              {/* Flute Groove Shadow Lines */}
              <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-2 border-x border-[#120A05] opacity-60" />

              {/* Lower Strap Hinge */}
              <div className="w-4 sm:w-6 h-10 brass-hinge-strap rounded-xs border border-[#5E4717] flex flex-col items-center justify-around py-1 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
                <div className="w-1 h-3 bg-[#523E14] rounded-2xs" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
              </div>
            </div>

            {/* Carved Base */}
            <div className="h-5 w-full bg-gradient-to-t from-[#4A2E1B] to-[#28180E] border-y border-[#6B4226]/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]/70 shadow-2xs" />
            </div>
          </div>

          {/* CENTRAL INTERIOR & 3D DOORS CONTAINER */}
          <div className="relative flex-1 perspective-armoire bg-[#22150E] flex flex-col">
            {/* ....................................................
                INTERIOR DRESSING ROOM (Always in DOM)
               .................................................... */}
            <div className="relative flex-1 flex flex-col bg-[#2A1B13] p-4 sm:p-7 space-y-6 overflow-y-auto max-h-[820px] scrollbar-thin scrollbar-thumb-[#4A2E1B]">
              {/* Recessed Warm Champagne / Amber LED Glow */}
              <div className="absolute inset-0 armoire-interior-lighting pointer-events-none z-10" />

              {/* Interior Back Panel Woodgrain Overlay */}
              <div className="absolute inset-0 wood-walnut-horizontal opacity-30 pointer-events-none" />

              {/* Deep Interior Shadow Falloff */}
              <div className="absolute inset-0 shadow-[inset_0_20px_35px_rgba(0,0,0,0.65),inset_0_-20px_35px_rgba(0,0,0,0.65)] pointer-events-none z-10" />

              {/* ------------------------------------------------
                  ZONE 1: UPPER HANGING RAIL (T-Shirts & Tops)
                 ------------------------------------------------ */}
              {(activeCompartment === "all" || activeCompartment === "tops") && (
                <div className="relative z-20 space-y-3">
                  {/* Compartment Title Frieze */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#523522]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E6C65C] shadow-xs" />
                      <span className="text-xs uppercase tracking-[0.2em] font-serif font-medium text-[#F4F0E8]">
                        Upper Hanging Rail
                      </span>
                      <span className="text-[10px] text-[#C4B7A6] font-light">
                        • Everyday T-Shirts, Shirts & Tops ({activeTops.length})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-[#E6C65C]/80">
                      ZONE 01 • TOPS
                    </span>
                  </div>

                  {/* Physical Cylindrical Brass Rail Pole */}
                  <div className="relative pt-2 pb-2">
                    {/* Left & Right Brass Mounting Rosettes */}
                    <div className="absolute left-0 top-1.5 w-3 h-5 brass-metallic-sheen rounded-r-xs border border-[#523E14] z-10 shadow-sm" />
                    <div className="absolute right-0 top-1.5 w-3 h-5 brass-metallic-sheen rounded-l-xs border border-[#523E14] z-10 shadow-sm" />

                    {/* Heavy Cylindrical Rail Pole */}
                    <div className="h-2.5 w-full brass-rail-pole rounded-full mx-2 shadow-md relative">
                      {/* Top highlight glint */}
                      <div className="absolute inset-x-0 top-[1px] h-[1px] bg-white/50 rounded-full" />
                    </div>

                    {/* Garments Hanging on Upper Rail */}
                    {activeTops.length > 0 ? (
                      <div className="pt-2 flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#5E3B24]">
                        {activeTops.map((item) => (
                          <div key={item.id} className="shrink-0">
                            <HangerGarment item={item} onSelect={onSelectItem} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-[#1B1009]/60 rounded-xs border border-dashed border-[#5E3B24] my-2">
                        <p className="text-xs text-[#C5BDB0] font-serif italic">
                          No tops currently hanging on this rail.
                        </p>
                        <Link
                          href="/collections/tshirts"
                          className="inline-flex items-center gap-1.5 text-xs text-[#F3DE8A] font-medium mt-2 hover:underline uppercase tracking-wider"
                        >
                          Explore T-Shirts Collection <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------
                  ZONE 2: SPLIT MID SECTION (Bottoms Left + Tall Bay Right)
                 ------------------------------------------------ */}
              {(activeCompartment === "all" ||
                activeCompartment === "bottoms" ||
                activeCompartment === "dresses") && (
                <div className="relative z-20 grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                  {/* LEFT BAY: Jeans, Trousers & Skirts */}
                  {(activeCompartment === "all" || activeCompartment === "bottoms") && (
                    <div
                      className={`space-y-3 ${
                        activeCompartment === "bottoms" ? "md:col-span-12" : "md:col-span-7"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#523522]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#E6C65C] shadow-xs" />
                          <span className="text-xs uppercase tracking-[0.2em] font-serif font-medium text-[#F4F0E8]">
                            Lower Rail & Shelves
                          </span>
                          <span className="text-[10px] text-[#C4B7A6] font-light">
                            • Jeans, Trousers & Skirts ({bottoms.length})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono tracking-widest text-[#E6C65C]/80">
                          BAY 02-A
                        </span>
                      </div>

                      {/* Solid Walnut Shelf with Brass Rail Underneath */}
                      <div className="relative pt-2">
                        {/* Solid Walnut Horizontal Shelf */}
                        <div className="h-3 w-full wood-walnut-horizontal border-t border-[#6B4226] border-b border-[#140C07] shelf-depth-shadow relative mb-3 rounded-2xs">
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-white/20" />
                        </div>

                        {/* Rail Pole */}
                        <div className="h-2 w-full brass-rail-pole rounded-full shadow-md" />

                        {bottoms.length > 0 ? (
                          <div className="pt-2 flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#5E3B24]">
                            {bottoms.map((item) => (
                              <div key={item.id} className="shrink-0">
                                <HangerGarment item={item} onSelect={onSelectItem} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center bg-[#1B1009]/60 rounded-xs border border-dashed border-[#5E3B24] my-2">
                            <p className="text-xs text-[#C5BDB0] font-serif italic">
                              No denim or trousers currently stored in this bay.
                            </p>
                            <Link
                              href="/collections/jeans"
                              className="inline-flex items-center gap-1.5 text-xs text-[#F3DE8A] font-medium mt-2 hover:underline uppercase tracking-wider"
                            >
                              Explore Denim & Trousers <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RIGHT BAY: Full-Height Tall Bay for Dresses & Long Coats */}
                  {(activeCompartment === "all" || activeCompartment === "dresses") && (
                    <div
                      className={`space-y-3 ${
                        activeCompartment === "all"
                          ? "md:col-span-5 md:border-l-4 md:border-[#1A0F0A] md:pl-6"
                          : "md:col-span-12"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#523522]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#E6C65C] shadow-xs" />
                          <span className="text-xs uppercase tracking-[0.2em] font-serif font-medium text-[#F4F0E8]">
                            Tall Bay
                          </span>
                          <span className="text-[10px] text-[#C4B7A6] font-light">
                            • Dresses & Robes ({dresses.length})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono tracking-widest text-[#E6C65C]/80">
                          BAY 02-B
                        </span>
                      </div>

                      {/* High-Mounted Brass Rail for Full Drape Clearance */}
                      <div className="relative pt-2">
                        <div className="h-2 w-full brass-rail-pole rounded-full shadow-md" />

                        {dresses.length > 0 ? (
                          <div className="pt-2 flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#5E3B24]">
                            {dresses.map((item) => (
                              <div key={item.id} className="shrink-0">
                                <HangerGarment item={item} onSelect={onSelectItem} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-12 text-center bg-[#1B1009]/60 rounded-xs border border-dashed border-[#5E3B24] my-2">
                            <p className="text-xs text-[#C5BDB0] font-serif italic">
                              No full-length dresses stored in the tall bay.
                            </p>
                            <Link
                              href="/collections/dresses"
                              className="inline-flex items-center gap-1.5 text-xs text-[#F3DE8A] font-medium mt-2 hover:underline uppercase tracking-wider"
                            >
                              Explore Dresses <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------
                  ZONE 3: BUILT-IN PULL-OUT WALNUT DRAWERS
                 ------------------------------------------------ */}
              {(activeCompartment === "all" || activeCompartment === "drawers") && (
                <div className="relative z-20 pt-4 border-t-2 border-[#180E09] space-y-4">
                  {/* Drawers Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#E6C65C] shadow-xs" />
                      <span className="text-xs uppercase tracking-[0.2em] font-serif font-medium text-[#F4F0E8]">
                        Handcrafted Walnut Drawers
                      </span>
                      <span className="text-[10px] text-[#C4B7A6] font-light">
                        • Folded Knitwear, Fine Accessories & Vault Essentials ({drawerItems.length})
                      </span>
                    </div>
                    <button
                      onClick={() => setDrawersOpen(!drawersOpen)}
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#F3DE8A] font-medium hover:text-white transition-colors"
                    >
                      {drawersOpen ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Push Drawers In
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" /> Slide Out Drawers
                        </>
                      )}
                    </button>
                  </div>

                  {/* Physical Walnut Drawer Fronts with Antique Brass Cup Handles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Drawer I: Knitwear & Cashmere */}
                    <div
                      onClick={() => setDrawersOpen(true)}
                      className={`cursor-pointer wood-walnut-horizontal border-2 border-[#140C07] rounded-xs p-4 sm:p-5 shadow-lg relative group transition-all duration-500 door-panel-raised ${
                        drawersOpen ? "ring-2 ring-[#D4AF37]/50 translate-y-1" : "hover:border-[#D4AF37]/40"
                      }`}
                    >
                      {/* Inset Burl Accent */}
                      <div className="absolute inset-2 wood-walnut-burl opacity-40 rounded-2xs pointer-events-none" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-[0.25em] text-[#E6C65C] font-mono block">
                            TIROIR 01 • KNITWEAR
                          </span>
                          <h5 className="text-xs font-serif text-[#F4F0E8] font-medium mt-0.5">
                            Fine Cashmere & Folded Sweaters
                          </h5>
                        </div>

                        {/* Handcrafted Antique Brass Cup Handle */}
                        <div className="w-10 h-5 rounded-b-lg brass-metallic-sheen border border-[#5E4717] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          <div className="w-2 h-0.5 bg-[#3B290B] rounded-full" />
                        </div>
                      </div>
                    </div>

                    {/* Drawer II: Accessories & Curated Accents */}
                    <div
                      onClick={() => setDrawersOpen(true)}
                      className={`cursor-pointer wood-walnut-horizontal border-2 border-[#140C07] rounded-xs p-4 sm:p-5 shadow-lg relative group transition-all duration-500 door-panel-raised ${
                        drawersOpen ? "ring-2 ring-[#D4AF37]/50 translate-y-1" : "hover:border-[#D4AF37]/40"
                      }`}
                    >
                      {/* Inset Burl Accent */}
                      <div className="absolute inset-2 wood-walnut-burl opacity-40 rounded-2xs pointer-events-none" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-[0.25em] text-[#E6C65C] font-mono block">
                            TIROIR 02 • ACCENTS
                          </span>
                          <h5 className="text-xs font-serif text-[#F4F0E8] font-medium mt-0.5">
                            Leather Accents, Scarves & Belts
                          </h5>
                        </div>

                        {/* Handcrafted Antique Brass Cup Handle */}
                        <div className="w-10 h-5 rounded-b-lg brass-metallic-sheen border border-[#5E4717] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          <div className="w-2 h-0.5 bg-[#3B290B] rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Extended Slide-Out Drawer Tray: Emerald Velvet Lined */}
                  {drawersOpen && (
                    <div className="p-5 sm:p-6 velvet-lining border-2 border-[#D4AF37]/40 rounded-xs space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center justify-between pb-2 border-b border-[#D4AF37]/25">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#E6C65C] shadow-xs" />
                          <span className="text-xs font-serif text-[#F3DE8A] font-medium tracking-wide">
                            Emerald Velvet Storage Organizer
                          </span>
                          <span className="text-[10px] text-[#A6C0B2] font-mono">
                            • Hand-stitched lining with modular dividers
                          </span>
                        </div>
                        <button
                          onClick={() => setDrawersOpen(false)}
                          className="text-[10px] uppercase tracking-widest text-[#D4AF37] hover:text-white transition-colors"
                        >
                          Push Back In
                        </button>
                      </div>

                      {drawerItems.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {drawerItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => onSelectItem(item)}
                              className="bg-[#14231B] p-3 border border-[#D4AF37]/30 rounded-xs hover:border-[#F3DE8A] cursor-pointer transition-all hover:scale-[1.02] shadow-md group"
                            >
                              <span className="text-[9px] uppercase tracking-widest text-[#D4AF37] block font-mono">
                                {item.category}
                              </span>
                              <p className="text-xs font-serif text-[#F4F0E8] font-medium truncate mt-1 group-hover:text-[#F3DE8A]">
                                {item.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-[#A6C0B2] mt-2 pt-1.5 border-t border-white/10">
                                <span>{item.color}</span>
                                <Eye className="w-3 h-3 text-[#D4AF37]" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-[#A6C0B2] space-y-1">
                          <p className="text-xs font-serif italic text-[#E2EBE6]">
                            No folded knitwear or leather accessories placed in the drawers yet.
                          </p>
                          <p className="text-[10px] text-[#8DA698]">
                            Pieces marked as knitwear or accessories automatically arrange inside these velvet compartments.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ....................................................
                C. PHYSICAL 3D DOUBLE DOORS (Left & Right)
               .................................................... */}
            {/* LEFT DOOR */}
            <div
              onClick={() => {
                if (!doorsOpen) setDoorsOpen(true);
              }}
              className={`absolute inset-y-0 left-0 w-1/2 preserve-3d origin-left transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 select-none ${
                doorsOpen ? "pointer-events-none" : "cursor-pointer"
              }`}
              style={{
                transform: doorsOpen ? "rotateY(-108deg)" : "rotateY(0deg)",
              }}
            >
              {/* Outer Door Face */}
              <div className="absolute inset-0 wood-walnut-frame border-r border-[#0D0704] shadow-2xl p-3 sm:p-5 flex flex-col justify-between backface-hidden">
                {/* Upper Raised Wood Panel */}
                <div className="flex-1 wood-walnut-vertical door-panel-raised border-2 border-[#120A05] rounded-xs p-2 sm:p-3 relative mb-3">
                  {/* Bookmatched Burl Veneer Inset */}
                  <div className="w-full h-full wood-walnut-burl door-panel-inner-recess rounded-2xs border border-[#4A2E1B]/80 flex items-center justify-center p-3">
                    <div className="w-full h-full border border-dashed border-[#D4AF37]/15 rounded-2xs flex items-center justify-center" />
                  </div>
                </div>

                {/* Lower Raised Wood Panel */}
                <div className="h-28 sm:h-36 wood-walnut-vertical door-panel-raised border-2 border-[#120A05] rounded-xs p-2 relative">
                  <div className="w-full h-full wood-walnut-burl door-panel-inner-recess rounded-2xs border border-[#4A2E1B]/80" />
                </div>

                {/* Left Door Handle & Half Escutcheon Lock */}
                <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex items-center">
                  {/* Left Antique Brass Escutcheon Half */}
                  <div className="w-4 h-24 brass-metallic-sheen rounded-l-md border-y border-l border-[#5E4717] shadow-lg flex flex-col items-center justify-around py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
                    {/* Keyhole half */}
                    <div className="w-1 h-3 bg-[#1A1005] rounded-l-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
                  </div>
                  {/* Left Brass Drop-Ring Handle */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-12 brass-metallic-sheen rounded-full border border-[#5E4717] shadow-xl" />
                </div>
              </div>

              {/* Inner Door Face (Visible when open at 108 deg) */}
              <div
                className="absolute inset-0 wood-walnut-vertical border-l-2 border-[#1A0F0A] p-4 flex flex-col justify-between shadow-2xl backface-hidden"
                style={{ transform: "rotateY(180deg)" }}
              >
                <div className="flex-1 wood-walnut-horizontal door-panel-inner-recess border border-[#140C07] rounded-xs p-3">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-serif text-[#C5BDB0]/60 block text-center">
                    Maison DRAPE Atelier
                  </span>
                </div>
                <div className="h-24 wood-walnut-horizontal door-panel-inner-recess border border-[#140C07] rounded-xs mt-3" />
              </div>
            </div>

            {/* RIGHT DOOR */}
            <div
              onClick={() => {
                if (!doorsOpen) setDoorsOpen(true);
              }}
              className={`absolute inset-y-0 right-0 w-1/2 preserve-3d origin-right transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] z-30 select-none ${
                doorsOpen ? "pointer-events-none" : "cursor-pointer"
              }`}
              style={{
                transform: doorsOpen ? "rotateY(108deg)" : "rotateY(0deg)",
              }}
            >
              {/* Outer Door Face */}
              <div className="absolute inset-0 wood-walnut-frame border-l border-[#0D0704] shadow-2xl p-3 sm:p-5 flex flex-col justify-between backface-hidden">
                {/* Center Astragal Seam Moulding Overhang */}
                <div className="absolute inset-y-0 -left-1.5 w-3 wood-walnut-vertical border-x border-[#120A05] shadow-md z-10" />

                {/* Upper Raised Wood Panel */}
                <div className="flex-1 wood-walnut-vertical door-panel-raised border-2 border-[#120A05] rounded-xs p-2 sm:p-3 relative mb-3">
                  {/* Bookmatched Burl Veneer Inset */}
                  <div className="w-full h-full wood-walnut-burl door-panel-inner-recess rounded-2xs border border-[#4A2E1B]/80 flex items-center justify-center p-3">
                    <div className="w-full h-full border border-dashed border-[#D4AF37]/15 rounded-2xs flex items-center justify-center" />
                  </div>
                </div>

                {/* Lower Raised Wood Panel */}
                <div className="h-28 sm:h-36 wood-walnut-vertical door-panel-raised border-2 border-[#120A05] rounded-xs p-2 relative">
                  <div className="w-full h-full wood-walnut-burl door-panel-inner-recess rounded-2xs border border-[#4A2E1B]/80" />
                </div>

                {/* Right Door Handle & Half Escutcheon Lock */}
                <div className="absolute top-1/2 -translate-y-1/2 left-1.5 flex items-center">
                  {/* Right Brass Drop-Ring Handle */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-12 brass-metallic-sheen rounded-full border border-[#5E4717] shadow-xl" />
                  {/* Right Antique Brass Escutcheon Half */}
                  <div className="w-4 h-24 brass-metallic-sheen rounded-r-md border-y border-r border-[#5E4717] shadow-lg flex flex-col items-center justify-around py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
                    {/* Keyhole half */}
                    <div className="w-1 h-3 bg-[#1A1005] rounded-r-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3B290B] shadow-inner" />
                  </div>
                </div>
              </div>

              {/* Inner Door Face (Visible when open at 108 deg) */}
              <div
                className="absolute inset-0 wood-walnut-vertical border-r-2 border-[#1A0F0A] p-4 flex flex-col justify-between shadow-2xl backface-hidden"
                style={{ transform: "rotateY(180deg)" }}
              >
                <div className="flex-1 wood-walnut-horizontal door-panel-inner-recess border border-[#140C07] rounded-xs p-3">
                  <span className="text-[9px] uppercase tracking-[0.2em] font-serif text-[#C5BDB0]/60 block text-center">
                    Haute Ébénisterie
                  </span>
                </div>
                <div className="h-24 wood-walnut-horizontal door-panel-inner-recess border border-[#140C07] rounded-xs mt-3" />
              </div>
            </div>

            {/* ....................................................
                D. CLOSED STATE INVITATION OVERLAY
               .................................................... */}
            {!doorsOpen && (
              <div className="absolute inset-0 flex items-center justify-center p-6 z-40 pointer-events-none animate-in fade-in duration-700">
                <div className="bg-[#160E08]/90 backdrop-blur-md p-6 sm:p-8 border-2 border-[#D4AF37]/50 rounded-sm max-w-md text-center shadow-2xl pointer-events-auto space-y-4">
                  <div className="w-10 h-10 rounded-full brass-metallic-sheen border border-[#5E4717] flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="w-5 h-5 text-[#28180E]" />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#E6C65C] block">
                      DRAPE ATELIER
                    </span>
                    <h3 className="text-2xl font-serif text-[#F4F0E8] font-normal tracking-wide mt-1">
                      Your Private Armoire
                    </h3>
                    <p className="text-xs text-[#D1C7BA] mt-2 font-light leading-relaxed">
                      Preserving {items.length} garments in bespoke walnut craftsmanship, linked to
                      real-time 3D virtual try-on and styling.
                    </p>
                  </div>

                  <button
                    onClick={() => setDoorsOpen(true)}
                    className="w-full py-3 brass-metallic-sheen text-[#28180E] text-xs uppercase tracking-[0.2em] font-semibold rounded-xs shadow-lg hover:brightness-110 transition-all border border-[#5E4717]"
                  >
                    Open Armoire Doors
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT FLUTED PILASTER / COLUMN */}
          <div className="w-7 sm:w-11 shrink-0 wood-walnut-vertical relative border-l-2 border-[#120A05] flex flex-col justify-between py-6 z-20 shadow-lg">
            {/* Carved Capital */}
            <div className="h-5 w-full bg-gradient-to-b from-[#4A2E1B] to-[#28180E] border-y border-[#6B4226]/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]/70 shadow-2xs" />
            </div>

            {/* Fluted Vertical Shaft with Antique Brass Strap Hinges */}
            <div className="flex-1 relative flex flex-col justify-around py-8 items-center">
              {/* Upper Strap Hinge */}
              <div className="w-4 sm:w-6 h-10 brass-hinge-strap rounded-xs border border-[#5E4717] flex flex-col items-center justify-around py-1 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
                <div className="w-1 h-3 bg-[#523E14] rounded-2xs" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
              </div>

              {/* Flute Groove Shadow Lines */}
              <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-2 border-x border-[#120A05] opacity-60" />

              {/* Lower Strap Hinge */}
              <div className="w-4 sm:w-6 h-10 brass-hinge-strap rounded-xs border border-[#5E4717] flex flex-col items-center justify-around py-1 shadow-md">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
                <div className="w-1 h-3 bg-[#523E14] rounded-2xs" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#3A2A0C] shadow-inner" />
              </div>
            </div>

            {/* Carved Base */}
            <div className="h-5 w-full bg-gradient-to-t from-[#4A2E1B] to-[#28180E] border-y border-[#6B4226]/40 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#D4AF37]/70 shadow-2xs" />
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            C. SOLID PLINTH BASE WITH BRACKET FEET
           ---------------------------------------------------- */}
        <div className="relative z-30">
          {/* Upper Plinth Moulding Torus */}
          <div className="h-2 w-full bg-[#120A05] border-t border-black/40" />

          {/* Heavy Solid Dark Walnut Plinth Base */}
          <div className="h-10 sm:h-12 w-[calc(100%+16px)] -ml-2 wood-walnut-horizontal border-t border-[#6B4226] border-b-2 border-[#120A05] relative flex items-center justify-between px-6 shadow-xl">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15" />

            {/* Left Bracket Foot Profile */}
            <div className="w-12 sm:w-16 h-full bg-gradient-to-r from-[#180E08] to-transparent flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#D4AF37]/50 shadow-xs" />
            </div>

            {/* Subtle Atelier Engraving */}
            <span className="text-[9px] uppercase tracking-[0.3em] font-serif text-[#D4AF37]/40">
              Haute Ébénisterie Française
            </span>

            {/* Right Bracket Foot Profile */}
            <div className="w-12 sm:w-16 h-full bg-gradient-to-l from-[#180E08] to-transparent flex items-center justify-end">
              <div className="w-3 h-3 rounded-full bg-[#D4AF37]/50 shadow-xs" />
            </div>
          </div>

          {/* Realistic Furniture Ground Shadow */}
          <div className="h-6 w-full bg-gradient-to-b from-black/60 via-black/20 to-transparent blur-xs pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
