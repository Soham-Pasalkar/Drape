"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Layers,
  Sparkles,
  Trash2,
  AlertCircle,
  X,
  Tag,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Outfit,
  WardrobeItem,
  getOutfits,
  createOutfit,
  deleteOutfit,
  getWardrobeItems,
} from "@/lib/api";

export default function OutfitsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newOutfitName, setNewOutfitName] = useState<string>("");
  const [newOutfitDesc, setNewOutfitDesc] = useState<string>("");
  const [newOutfitOccasion, setNewOutfitOccasion] = useState<string>("atelier");
  const [newOutfitSeason, setNewOutfitSeason] = useState<string>("all-season");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<WardrobeItem[]>([]);
  const [creating, setCreating] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOutfits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getOutfits();
      setOutfits(res.outfits);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setError(e.detail || e.message || "Failed to load outfits.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/outfits");
    } else if (user) {
      fetchOutfits();
    }
  }, [user, authLoading, router, fetchOutfits]);

  const openCreateModal = async () => {
    setIsModalOpen(true);
    setNewOutfitName("");
    setNewOutfitDesc("");
    setSelectedItemIds([]);
    try {
      const res = await getWardrobeItems({ limit: 100 });
      setAvailableItems(res.items);
    } catch (err) {
      console.error("Failed to load wardrobe items for outfit builder:", err);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutfitName.trim()) return;

    setCreating(true);
    try {
      await createOutfit({
        name: newOutfitName.trim(),
        description: newOutfitDesc.trim() || undefined,
        occasion: newOutfitOccasion,
        season: newOutfitSeason,
        item_ids: selectedItemIds,
      });
      setIsModalOpen(false);
      await fetchOutfits();
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Unable to save outfit.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOutfit = async (id: string, name: string) => {
    if (!window.confirm(`Delete outfit "${name}"? Wardrobe garments will remain preserved.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteOutfit(id);
      setOutfits((prev) => prev.filter((o) => o.id !== id));
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Failed to delete outfit.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-ink-black/20 border-t-ink-black animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory text-ink-black pb-24">
      {/* Masthead */}
      <section className="border-b border-ink-black/10 pt-12 pb-10 bg-warm-ivory/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Breadcrumbs */}
          <Link
            href="/wardrobe"
            className="inline-flex items-center text-xs uppercase tracking-widest text-ink-black/60 hover:text-ink-black transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            <span>Return to All Garments</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
                <span>CURATED ENSEMBLES</span>
                <span>•</span>
                <span>{outfits.length} SAVED COMPOSITIONS</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-serif font-normal text-ink-black tracking-tight">
                Outfit Ensembles.
              </h1>
              <p className="text-xs sm:text-sm text-ink-black/70 font-light max-w-xl leading-relaxed">
                Harmonized combinations crafted from your personal archive. Plan seasonal silhouettes
                and coordinate layered palettes.
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-6 py-3.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90 transition-colors shadow-sm self-start md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Compose New Outfit</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-10">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 text-red-900 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-4 p-6 border border-ink-black/10">
                <div className="aspect-[16/10] bg-ink-black/5" />
                <div className="h-5 bg-ink-black/10 w-2/3" />
                <div className="h-3 bg-ink-black/5 w-1/2" />
              </div>
            ))}
          </div>
        ) : outfits.length === 0 ? (
          /* Empty State */
          <div className="text-center py-24 max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 border border-ink-black/20 rounded-full flex items-center justify-center mx-auto text-ink-black/40">
              <Layers className="w-6 h-6 stroke-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-normal text-ink-black">No Ensembles Curated Yet.</h3>
              <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                Combine layered overcoats, tailored trousers, and knitwear from your wardrobe to
                compose your first signature silhouette.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-6 py-3 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90 transition-colors"
            >
              Compose First Ensemble
            </button>
          </div>
        ) : (
          /* Outfits Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {outfits.map((outfit) => (
              <div
                key={outfit.id}
                className="group relative bg-warm-ivory border border-ink-black/15 flex flex-col justify-between hover:border-ink-black/40 transition-colors duration-300 shadow-sm"
              >
                {/* Visual Preview / Collaged Thumbnails */}
                <Link href={`/wardrobe/outfits/${outfit.id}`} className="block relative aspect-[16/10] bg-ink-black/5 overflow-hidden">
                  {outfit.items.length > 0 ? (
                    <div className="grid grid-cols-3 h-full w-full divide-x divide-ink-black/10">
                      {outfit.items.slice(0, 3).map((oi, idx) => (
                        <div key={idx} className="relative h-full w-full bg-ink-black/5">
                          {oi.wardrobe_item?.image_url ? (
                            <Image
                              src={oi.wardrobe_item.image_url}
                              alt={oi.wardrobe_item.name}
                              fill
                              className="object-cover object-top"
                              sizes="150px"
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center text-[9px] uppercase tracking-widest font-mono text-ink-black/40 p-2 text-center">
                              {oi.wardrobe_item?.category || "Garment"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-ink-black/30 space-y-2">
                      <Tag className="w-8 h-8 stroke-1" />
                      <span className="text-[10px] uppercase tracking-widest font-mono">Empty Ensemble</span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 bg-warm-ivory/95 border border-ink-black/15 text-ink-black text-[9px] uppercase tracking-widest font-mono font-medium">
                      {outfit.items.length} Piece{outfit.items.length !== 1 ? "s" : ""}
                    </span>
                    {outfit.occasion && (
                      <span className="px-2.5 py-0.5 bg-ink-black text-warm-ivory text-[9px] uppercase tracking-widest font-mono font-medium">
                        {outfit.occasion}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-serif font-medium text-ink-black">
                        <Link href={`/wardrobe/outfits/${outfit.id}`} className="hover:text-electric-blue transition-colors">
                          {outfit.name}
                        </Link>
                      </h3>
                      <button
                        onClick={() => handleDeleteOutfit(outfit.id, outfit.name)}
                        disabled={deletingId === outfit.id}
                        className="text-ink-black/40 hover:text-red-600 transition-colors p-1"
                        title="Delete ensemble"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {outfit.description && (
                      <p className="text-xs text-ink-black/70 font-light line-clamp-2 leading-relaxed">
                        {outfit.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-ink-black/10 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                      {outfit.season || "All Season"}
                    </span>
                    <Link
                      href={`/wardrobe/outfits/${outfit.id}`}
                      className="text-xs uppercase tracking-wider font-semibold text-ink-black group-hover:text-electric-blue transition-colors flex items-center"
                    >
                      <span>Inspect Ensemble</span>
                      <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Compose Outfit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-warm-ivory border border-ink-black/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-black/10 pb-4">
              <h2 className="text-2xl font-serif text-ink-black">Compose Curated Ensemble</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-black/50 hover:text-ink-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOutfit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                    Ensemble Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Minimalist Tailored Evening"
                    value={newOutfitName}
                    onChange={(e) => setNewOutfitName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                      Occasion
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Atelier, Formal, Casual"
                      value={newOutfitOccasion}
                      onChange={(e) => setNewOutfitOccasion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                      Season
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Autumn / Winter"
                      value={newOutfitSeason}
                      onChange={(e) => setNewOutfitSeason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                    Styling Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the silhouette balance, occasion purpose, or mood..."
                    value={newOutfitDesc}
                    onChange={(e) => setNewOutfitDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                  />
                </div>
              </div>

              {/* Garment Selector */}
              <div className="space-y-2 border-t border-ink-black/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                    Select Member Garments ({selectedItemIds.length} Selected)
                  </label>
                </div>

                {availableItems.length === 0 ? (
                  <p className="text-xs text-ink-black/50 py-4 italic">
                    No garments available. You can also create the outfit now and link garments later.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto p-1 border border-ink-black/10">
                    {availableItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItemSelection(item.id)}
                          className={`p-3 border cursor-pointer text-xs space-y-1 transition-all ${
                            isSelected
                              ? "bg-ink-black text-warm-ivory border-ink-black"
                              : "bg-warm-ivory text-ink-black border-ink-black/15 hover:border-ink-black/40"
                          }`}
                        >
                          <div className="font-medium line-clamp-1">{item.name}</div>
                          <div className={`text-[10px] uppercase font-mono ${isSelected ? "text-warm-ivory/70" : "text-ink-black/50"}`}>
                            {item.category} • {item.color}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-ink-black/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs uppercase tracking-wider text-ink-black/70 hover:text-ink-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newOutfitName.trim()}
                  className="px-6 py-2.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90 disabled:opacity-50"
                >
                  {creating ? "Composing..." : "Save Ensemble"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
