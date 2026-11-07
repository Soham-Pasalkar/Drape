"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Grid,
  Archive,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  WardrobeItem,
  WardrobeStats,
  getWardrobeItems,
  getWardrobeStats,
  deleteWardrobeItem,
  importAllPurchases,
  ImportPurchasesResponse,
} from "@/lib/api";
import { CupboardCloset } from "@/components/wardrobe/CupboardCloset";
import { GarmentDetailModal } from "@/components/wardrobe/GarmentDetailModal";
import { WardrobeStatsBanner } from "@/components/wardrobe/WardrobeStatsBanner";
import { getWardrobeItemTryOnStatus } from "@/features/wardrobe/tryOnMatcher";

const CATEGORIES = [
  { id: "all", label: "All Pieces" },
  { id: "t-shirts", label: "T-Shirts" },
  { id: "jeans", label: "Jeans" },
  { id: "trousers", label: "Trousers" },
  { id: "skirts", label: "Skirts" },
  { id: "dresses", label: "Dresses" },
  { id: "shirts", label: "Shirts" },
  { id: "outerwear", label: "Outerwear" },
  { id: "knitwear", label: "Knitwear" },
  { id: "accessories", label: "Accessories" },
];

export default function WardrobePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: interactive physical cupboard or editorial grid
  const [viewMode, setViewMode] = useState<"cupboard" | "grid">("cupboard");

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Detail Modal & Deletion State
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Import Action State
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportPurchasesResponse | null>(null);

  const fetchItemsAndStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        getWardrobeItems({
          category: selectedCategory === "all" ? undefined : selectedCategory,
          source: selectedSource === "all" ? undefined : selectedSource,
          search: searchQuery.trim() || undefined,
          sort_by: sortBy,
          limit: 100,
        }),
        getWardrobeStats(),
      ]);
      setItems(itemsRes.items);
      setTotalCount(itemsRes.total);
      setStats(statsRes);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setError(e.detail || e.message || "Unable to load wardrobe items.");
    } finally {
      setLoading(false);
    }
  }, [user, selectedCategory, selectedSource, searchQuery, sortBy]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe");
    } else if (user) {
      fetchItemsAndStats();
    }
  }, [user, authLoading, router, fetchItemsAndStats]);

  const handleImportPurchases = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await importAllPurchases();
      setImportResult(res);
      await fetchItemsAndStats();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setError(e.detail || e.message || "Failed to import purchases.");
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this garment from your wardrobe?")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteWardrobeItem(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setSelectedItem(null);
      // Refresh stats
      const statsRes = await getWardrobeStats();
      setStats(statsRes);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Failed to remove item.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-ink-black/20 border-t-ink-black animate-spin rounded-full mx-auto" />
          <p className="text-xs uppercase tracking-widest font-mono text-ink-black/60">
            Accessing Digital Armoire...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory text-ink-black pb-24">
      {/* Editorial Masthead */}
      <section className="border-b border-ink-black/10 pt-12 pb-8 bg-warm-ivory/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
                <span>DIGITAL WARDROBE</span>
                <span>•</span>
                <span>AR TRY-ON LINKED</span>
                <span>•</span>
                <span>{totalCount} GARMENTS</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif font-normal text-ink-black tracking-tight">
                My Digital Armoire.
              </h1>
              <p className="text-xs sm:text-sm text-ink-black/70 font-light max-w-xl leading-relaxed">
                An interactive physical closet storing your acquired DRAPE garments alongside personal
                pieces, connected to our AI fashion stylist and real-time 3D try-on.
              </p>
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 bg-[#EAE4D7] border border-ink-black/15 rounded-sm">
              <button
                onClick={() => setViewMode("cupboard")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors ${
                  viewMode === "cupboard"
                    ? "bg-ink-black text-warm-ivory shadow-xs"
                    : "text-ink-black/70 hover:text-ink-black"
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Closet View
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider font-medium rounded-xs transition-colors ${
                  viewMode === "grid"
                    ? "bg-ink-black text-warm-ivory shadow-xs"
                    : "text-ink-black/70 hover:text-ink-black"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Grid View
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 space-y-8">
        {/* Statistics & Quick Actions Banner */}
        <WardrobeStatsBanner
          stats={stats}
          onSyncPurchases={handleImportPurchases}
          isSyncing={importing}
        />

        {/* Sync Success Notification */}
        {importResult && (
          <div className="p-4 bg-ink-black/5 border border-ink-black/20 flex items-start justify-between rounded-sm">
            <div className="flex items-center space-x-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-ink-black">Order Synchronization Complete: </span>
                <span className="text-ink-black/80">
                  {importResult.created_count > 0
                    ? `Successfully imported ${importResult.created_count} garment${
                        importResult.created_count > 1 ? "s" : ""
                      } into your wardrobe.`
                    : "All items from your verified DRAPE orders are already synced."}
                </span>
                {importResult.skipped_count > 0 && (
                  <span className="text-ink-black/50 ml-1">
                    ({importResult.skipped_count} existing item{importResult.skipped_count > 1 ? "s" : ""}{" "}
                    skipped)
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="text-xs uppercase tracking-widest text-ink-black/50 hover:text-ink-black ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-900 text-xs flex items-center justify-between rounded-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="uppercase text-[10px] tracking-widest font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW MODE 1: INTERACTIVE PHYSICAL CUPBOARD */}
        {viewMode === "cupboard" && (
          <div className="space-y-4">
            <CupboardCloset items={items} onSelectItem={setSelectedItem} />
          </div>
        )}

        {/* VIEW MODE 2: CLASSIC EDITORIAL GRID */}
        {viewMode === "grid" && (
          <div className="space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="space-y-4 pb-6 border-b border-ink-black/10">
              {/* Category Tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 text-xs uppercase tracking-wider font-medium whitespace-nowrap transition-all border ${
                      selectedCategory === cat.id
                        ? "bg-ink-black text-warm-ivory border-ink-black"
                        : "bg-transparent text-ink-black/70 border-ink-black/15 hover:border-ink-black/40"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sub-Filters & Lexical Search Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  {/* Source Filter */}
                  <div className="flex items-center border border-ink-black/15 text-xs">
                    <button
                      onClick={() => setSelectedSource("all")}
                      className={`px-3 py-1.5 uppercase tracking-widest text-[10px] ${
                        selectedSource === "all"
                          ? "bg-ink-black text-warm-ivory"
                          : "text-ink-black/70 hover:bg-ink-black/5"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedSource("purchased")}
                      className={`px-3 py-1.5 uppercase tracking-widest text-[10px] border-l border-ink-black/15 ${
                        selectedSource === "purchased"
                          ? "bg-ink-black text-warm-ivory"
                          : "text-ink-black/70 hover:bg-ink-black/5"
                      }`}
                    >
                      Purchased
                    </button>
                    <button
                      onClick={() => setSelectedSource("manual")}
                      className={`px-3 py-1.5 uppercase tracking-widest text-[10px] border-l border-ink-black/15 ${
                        selectedSource === "manual"
                          ? "bg-ink-black text-warm-ivory"
                          : "text-ink-black/70 hover:bg-ink-black/5"
                      }`}
                    >
                      Vault
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent border border-ink-black/15 text-[11px] uppercase tracking-wider px-3 py-1.5 text-ink-black/80 focus:outline-none focus:border-ink-black"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                  </select>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-black/40" />
                  <input
                    type="text"
                    placeholder="Search archive or label..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-transparent border border-ink-black/15 text-xs text-ink-black placeholder:text-ink-black/40 focus:outline-none focus:border-ink-black"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-ink-black/40 hover:text-ink-black"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Items List */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse space-y-3">
                    <div className="aspect-[3/4] bg-ink-black/5 border border-ink-black/10" />
                    <div className="h-4 bg-ink-black/10 w-2/3" />
                    <div className="h-3 bg-ink-black/5 w-1/2" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-24 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 border border-ink-black/20 rounded-full flex items-center justify-center mx-auto text-ink-black/40">
                  <Layers className="w-6 h-6 stroke-1" />
                </div>
                <h3 className="text-2xl font-serif text-ink-black">No Garments Found</h3>
                <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                  Clear your filter or search parameters to view your full collection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {items.map((item) => {
                  const tryOnStatus = getWardrobeItemTryOnStatus(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group relative bg-[#FAF7F2] border border-ink-black/15 flex flex-col justify-between hover:border-ink-black/40 transition-colors duration-300 cursor-pointer rounded-xs overflow-hidden"
                    >
                      <div className="relative aspect-[3/4] w-full bg-[#F2EDE4] overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-ink-black/30 space-y-2">
                            <Tag className="w-8 h-8 stroke-1" />
                            <span className="text-[10px] uppercase tracking-widest font-mono">
                              No Imagery
                            </span>
                          </div>
                        )}

                        {/* Try-on badge */}
                        {tryOnStatus.isCompatible && (
                          <div className="absolute top-2.5 right-2.5 z-10">
                            <span className="inline-flex items-center gap-1 bg-[#294BFF] text-white text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full shadow-xs">
                              <Sparkles className="w-2.5 h-2.5" />
                              3D Ready
                            </span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2 py-0.5 bg-ink-black text-warm-ivory text-[9px] uppercase tracking-widest font-mono font-medium">
                            {item.source === "purchased" ? "DRAPE Order" : "Vault"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between bg-[#FAF7F2]">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50 block">
                            {item.brand || "DRAPE Atelier"} • {item.category}
                          </span>
                          <h4 className="text-sm font-serif font-medium text-ink-black line-clamp-1 group-hover:text-[#294BFF] transition-colors">
                            {item.name}
                          </h4>
                        </div>

                        <div className="pt-2 border-t border-ink-black/10 flex items-center justify-between text-[11px] text-ink-black/70 font-mono uppercase">
                          <span>{item.color}</span>
                          {item.size && <span>Size {item.size}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Garment Details Modal */}
      <GarmentDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDeleteItem}
        isDeleting={deletingId !== null}
      />
    </div>
  );
}
