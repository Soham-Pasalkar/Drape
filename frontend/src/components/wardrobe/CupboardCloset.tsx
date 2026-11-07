"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Sparkles, SlidersHorizontal, DoorOpen, DoorClosed, ArrowRight } from "lucide-react";
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
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);

  // Group items by physical closet zones
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
    return c.includes("dress") || n.includes("dress") || c.includes("coat") || n.includes("coat");
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
      n.includes("belt")
    );
  });

  // Remaining or unclassified garments fall into tops or bottoms
  const classifiedIds = new Set([
    ...tops.map((i) => i.id),
    ...bottoms.map((i) => i.id),
    ...dresses.map((i) => i.id),
    ...drawerItems.map((i) => i.id),
  ]);
  const others = items.filter((it) => !classifiedIds.has(it.id));
  const activeTops = [...tops, ...others];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Cupboard Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] border border-[#E5DFD3] p-3 rounded-sm shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[#8C8275] uppercase tracking-wider text-[10px] font-medium mr-2 shrink-0">
            Closet Zone:
          </span>
          {(
            [
              { id: "all", label: `Full Wardrobe (${items.length})` },
              { id: "tops", label: `Upper Rail (${activeTops.length})` },
              { id: "bottoms", label: `Lower Rail & Shelves (${bottoms.length})` },
              { id: "dresses", label: `Tall Bay (${dresses.length})` },
              { id: "drawers", label: `Drawers (${drawerItems.length})` },
            ] as const
          ).map((zone) => (
            <button
              key={zone.id}
              onClick={() => setActiveCompartment(zone.id)}
              className={`px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wider text-[11px] font-medium shrink-0 ${
                activeCompartment === zone.id
                  ? "bg-[#111111] text-[#F4F0E8]"
                  : "text-[#5C5549] hover:bg-black/5"
              }`}
            >
              {zone.label}
            </button>
          ))}
        </div>

        {/* Door Toggle Button */}
        <button
          onClick={() => setDoorsOpen(!doorsOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] rounded-sm text-xs uppercase tracking-wider text-[#111111] font-medium transition-colors shadow-xs ml-auto"
        >
          {doorsOpen ? (
            <>
              <DoorClosed className="w-3.5 h-3.5 text-[#736B5E]" />
              Close Doors
            </>
          ) : (
            <>
              <DoorOpen className="w-3.5 h-3.5 text-[#294BFF]" />
              Open Doors
            </>
          )}
        </button>
      </div>

      {/* The Physical Wardrobe Cabinet Frame */}
      <div className="relative rounded-sm overflow-hidden border-[12px] border-[#2A1B12] bg-[#1E130D] shadow-2xl">
        {/* Brass Hardware Header Molding */}
        <div className="h-6 bg-gradient-to-r from-[#2A1B12] via-[#432A1C] to-[#2A1B12] border-b border-[#D4AF37]/40 flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-serif font-medium">
            DRAPE Atelier • Built-In Digital Armoire
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/50" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-xs" />
          </div>
        </div>

        {/* Closed Doors State */}
        {!doorsOpen && (
          <div className="relative min-h-[560px] bg-gradient-to-r from-[#24170E] via-[#3B2518] to-[#24170E] flex items-center justify-center p-8 transition-all duration-700">
            {/* Double Door Seam & Brass Lock Plate */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-[#140D08] shadow-md flex items-center justify-center">
              <div className="w-8 h-24 bg-gradient-to-b from-[#C5A059] via-[#E6C65C] to-[#B38F46] rounded-sm shadow-xl border border-[#7A6129] flex flex-col items-center justify-between py-2">
                <div className="w-2 h-2 rounded-full bg-[#4A3816] shadow-inner" />
                <div className="w-1 h-5 bg-[#2B200C] rounded-xs shadow-inner" />
                <div className="w-2 h-2 rounded-full bg-[#4A3816] shadow-inner" />
              </div>
            </div>

            {/* Left Brass Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 left-[calc(50%-36px)] w-2.5 h-20 bg-gradient-to-r from-[#D4AF37] to-[#AA8825] rounded-full shadow-lg border border-[#6E551B]" />
            {/* Right Brass Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 right-[calc(50%-36px)] w-2.5 h-20 bg-gradient-to-l from-[#D4AF37] to-[#AA8825] rounded-full shadow-lg border border-[#6E551B]" />

            {/* Wooden Inlay Panels */}
            <div className="grid grid-cols-2 gap-8 w-full max-w-4xl h-[460px] opacity-40 pointer-events-none">
              <div className="border border-[#140D08] rounded-xs bg-[#2F1D13]/60 shadow-inner" />
              <div className="border border-[#140D08] rounded-xs bg-[#2F1D13]/60 shadow-inner" />
            </div>

            <div className="absolute text-center z-10 bg-[#160E08]/85 backdrop-blur-sm p-6 border border-[#D4AF37]/30 rounded-sm max-w-md shadow-2xl">
              <h3 className="text-xl font-serif text-[#F4F0E8] font-medium tracking-wide">
                Your Private Closet
              </h3>
              <p className="text-xs text-[#C5BDB0] mt-1.5 font-sans leading-relaxed">
                Contains {items.length} garments preserved in your personal DRAPE wardrobe.
              </p>
              <button
                onClick={() => setDoorsOpen(true)}
                className="mt-4 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#C29F2F] text-[#111111] text-xs uppercase tracking-widest font-semibold rounded-xs shadow-md transition-colors"
              >
                Open Wardrobe Doors
              </button>
            </div>
          </div>
        )}

        {/* Opened Interior Cabinet Experience */}
        {doorsOpen && (
          <div className="bg-[#FAF7F2] p-4 sm:p-6 space-y-6 min-h-[580px] shadow-inner">
            {/* SECTION 1: UPPER HANGING RAIL (Tops, T-Shirts, Shirts) */}
            {(activeCompartment === "all" || activeCompartment === "tops") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DFD3]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-[#736B5E] font-medium">
                      Upper Hanging Rail
                    </span>
                    <span className="text-[10px] text-[#A39B8F]">
                      • Everyday T-Shirts, Tops & Shirts ({activeTops.length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#A39B8F]">Rail 01</span>
                </div>

                {/* Brass Rail Pole */}
                <div className="relative pt-2">
                  <div className="h-2 w-full bg-gradient-to-r from-[#AA8825] via-[#E6C65C] to-[#AA8825] rounded-full shadow-inner border border-[#85671B]" />

                  {/* Garments on Rail */}
                  {activeTops.length > 0 ? (
                    <div className="pt-1 flex items-start gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#D8D0C2]">
                      {activeTops.map((item) => (
                        <div key={item.id} className="shrink-0">
                          <HangerGarment item={item} onSelect={onSelectItem} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-[#F4EFE6]/60 rounded-sm border border-dashed border-[#D8D0C2] my-2">
                      <p className="text-xs text-[#8C8275] font-serif italic">
                        No tops currently hanging on this rail.
                      </p>
                      <Link
                        href="/collections/tshirts"
                        className="inline-flex items-center gap-1 text-[11px] text-[#294BFF] font-medium mt-2 hover:underline uppercase tracking-wider"
                      >
                        Explore T-Shirts Collection <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 2: SPLIT MID COMPARTMENT (Bottoms on Left + Tall Bay for Dresses on Right) */}
            {(activeCompartment === "all" ||
              activeCompartment === "bottoms" ||
              activeCompartment === "dresses") && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                {/* Left Bay: Jeans, Trousers & Skirts */}
                {(activeCompartment === "all" || activeCompartment === "bottoms") && (
                  <div
                    className={`space-y-2 ${
                      activeCompartment === "bottoms" ? "md:col-span-12" : "md:col-span-8"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DFD3]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-widest text-[#736B5E] font-medium">
                          Lower Rail & Shelves
                        </span>
                        <span className="text-[10px] text-[#A39B8F]">
                          • Jeans, Trousers & Skirts ({bottoms.length})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#A39B8F]">Bay 02-A</span>
                    </div>

                    <div className="relative pt-2">
                      <div className="h-2 w-full bg-gradient-to-r from-[#AA8825] via-[#E6C65C] to-[#AA8825] rounded-full shadow-inner border border-[#85671B]" />

                      {bottoms.length > 0 ? (
                        <div className="pt-1 flex items-start gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#D8D0C2]">
                          {bottoms.map((item) => (
                            <div key={item.id} className="shrink-0">
                              <HangerGarment item={item} onSelect={onSelectItem} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center bg-[#F4EFE6]/60 rounded-sm border border-dashed border-[#D8D0C2] my-2">
                          <p className="text-xs text-[#8C8275] font-serif italic">
                            No denim or trousers currently in this section.
                          </p>
                          <Link
                            href="/collections/jeans"
                            className="inline-flex items-center gap-1 text-[11px] text-[#294BFF] font-medium mt-2 hover:underline uppercase tracking-wider"
                          >
                            Explore Denim & Trousers <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Right Bay: Tall Bay for Dresses & Long Coats */}
                {(activeCompartment === "all" || activeCompartment === "dresses") && (
                  <div
                    className={`space-y-2 border-t md:border-t-0 md:border-l md:border-[#E5DFD3] md:pl-6 ${
                      activeCompartment === "dresses" ? "md:col-span-12" : "md:col-span-4"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#E5DFD3]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] uppercase tracking-widest text-[#736B5E] font-medium">
                          Tall Bay
                        </span>
                        <span className="text-[10px] text-[#A39B8F]">
                          • Dresses & Full-Length ({dresses.length})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#A39B8F]">Bay 02-B</span>
                    </div>

                    <div className="relative pt-2">
                      <div className="h-2 w-full bg-gradient-to-r from-[#AA8825] via-[#E6C65C] to-[#AA8825] rounded-full shadow-inner border border-[#85671B]" />

                      {dresses.length > 0 ? (
                        <div className="pt-1 flex items-start gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#D8D0C2]">
                          {dresses.map((item) => (
                            <div key={item.id} className="shrink-0">
                              <HangerGarment item={item} onSelect={onSelectItem} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center bg-[#F4EFE6]/60 rounded-sm border border-dashed border-[#D8D0C2] my-2">
                          <p className="text-xs text-[#8C8275] font-serif italic">
                            No full-length garments in the tall bay.
                          </p>
                          <Link
                            href="/collections/dresses"
                            className="inline-flex items-center gap-1 text-[11px] text-[#294BFF] font-medium mt-2 hover:underline uppercase tracking-wider"
                          >
                            Explore Dresses <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: BOTTOM DRAWERS (Knitwear, Accessories, Folded Items) */}
            {(activeCompartment === "all" || activeCompartment === "drawers") && (
              <div className="pt-4 border-t border-[#E5DFD3] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-[#736B5E] font-medium">
                      Built-In Walnut Drawers
                    </span>
                    <span className="text-[10px] text-[#A39B8F]">
                      • Accessories, Knitwear & Folded Essentials ({drawerItems.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setOpenDrawer(!openDrawer)}
                    className="text-xs uppercase tracking-wider text-[#294BFF] font-medium hover:underline"
                  >
                    {openDrawer ? "Close Drawers" : "Slide Out Drawers"}
                  </button>
                </div>

                {/* Physical Drawer Visual with Brass Cup Handles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Drawer 1: Knitwear & Sweaters */}
                  <div
                    onClick={() => setOpenDrawer(true)}
                    className="cursor-pointer bg-gradient-to-b from-[#3A2619] to-[#25170E] border-2 border-[#1E130D] rounded-xs p-4 shadow-md flex items-center justify-between group hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-medium">
                        Drawer I
                      </span>
                      <h5 className="text-xs font-serif text-[#F4F0E8] mt-0.5">
                        Knitwear & Fine Cashmere
                      </h5>
                    </div>
                    {/* Brass Cup Drop Handle */}
                    <div className="w-8 h-4 rounded-b-md border-2 border-[#D4AF37] bg-gradient-to-b from-[#B89742] to-[#7D6425] shadow-xs group-hover:scale-110 transition-transform" />
                  </div>

                  {/* Drawer 2: Accessories & Jewelry */}
                  <div
                    onClick={() => setOpenDrawer(true)}
                    className="cursor-pointer bg-gradient-to-b from-[#3A2619] to-[#25170E] border-2 border-[#1E130D] rounded-xs p-4 shadow-md flex items-center justify-between group hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-medium">
                        Drawer II
                      </span>
                      <h5 className="text-xs font-serif text-[#F4F0E8] mt-0.5">
                        Leather Accessories & Accents
                      </h5>
                    </div>
                    {/* Brass Cup Drop Handle */}
                    <div className="w-8 h-4 rounded-b-md border-2 border-[#D4AF37] bg-gradient-to-b from-[#B89742] to-[#7D6425] shadow-xs group-hover:scale-110 transition-transform" />
                  </div>
                </div>

                {/* Extended Folded Garments Display when Drawer is Open */}
                {openDrawer && (
                  <div className="p-4 bg-[#F4EFE6] border border-[#E5DFD3] rounded-xs space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif text-[#111111] font-medium">
                        Folded Drawer Contents
                      </span>
                      <button
                        onClick={() => setOpenDrawer(false)}
                        className="text-[10px] uppercase tracking-wider text-[#736B5E] hover:text-[#111111]"
                      >
                        Hide
                      </button>
                    </div>

                    {drawerItems.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {drawerItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => onSelectItem(item)}
                            className="bg-[#FAF7F2] p-2.5 border border-[#E5DFD3] rounded-xs hover:border-[#294BFF] cursor-pointer transition-colors"
                          >
                            <span className="text-[9px] uppercase tracking-wider text-[#8C8275] block">
                              {item.category}
                            </span>
                            <p className="text-xs font-serif text-[#111111] font-medium truncate mt-0.5">
                              {item.name}
                            </p>
                            <span className="text-[10px] text-[#736B5E] block mt-1">
                              Color: {item.color}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8C8275] font-serif italic py-3 text-center">
                        No accessories or folded knitwear stored in these drawers yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
