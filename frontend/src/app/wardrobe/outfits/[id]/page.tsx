"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  AlertCircle,
  Tag,
  X,
  Edit2,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  Outfit,
  WardrobeItem,
  getOutfit,
  updateOutfit,
  deleteOutfit,
  addItemToOutfit,
  removeItemFromOutfit,
  reorderOutfitItems,
  getWardrobeItems,
} from "@/lib/api";

export default function OutfitDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode State
  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editOccasion, setEditOccasion] = useState<string>("");
  const [editSeason, setEditSeason] = useState<string>("");

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [availableItems, setAvailableItems] = useState<WardrobeItem[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchOutfit = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOutfit(id);
      setOutfit(data);
      setEditName(data.name);
      setEditDesc(data.description || "");
      setEditOccasion(data.occasion || "");
      setEditSeason(data.season || "");
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setError(e.detail || e.message || "Outfit ensemble not found.");
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/wardrobe/outfits/${id}`);
    } else if (user && id) {
      fetchOutfit();
    }
  }, [user, authLoading, id, router, fetchOutfit]);

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setActionLoading(true);
    try {
      const updated = await updateOutfit(id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        occasion: editOccasion.trim() || undefined,
        season: editSeason.trim() || undefined,
      });
      setOutfit(updated);
      setIsEditingMeta(false);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Failed to update outfit metadata.");
    } finally {
      setActionLoading(false);
    }
  };

  const openAddModal = async () => {
    setIsAddModalOpen(true);
    setLoadingAvailable(true);
    try {
      const res = await getWardrobeItems({ limit: 100 });
      // Exclude items already in this outfit
      const currentItemIds = new Set(outfit?.items.map((it) => it.wardrobe_item_id) || []);
      setAvailableItems(res.items.filter((it) => !currentItemIds.has(it.id)));
    } catch (err) {
      console.error("Failed to load wardrobe items:", err);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAddItem = async (wardrobeItemId: string) => {
    setActionLoading(true);
    try {
      const updated = await addItemToOutfit(id, wardrobeItemId);
      setOutfit(updated);
      setAvailableItems((prev) => prev.filter((it) => it.id !== wardrobeItemId));
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Unable to add item to outfit.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveItem = async (wardrobeItemId: string) => {
    if (!window.confirm("Remove this garment from the outfit ensemble?")) return;
    setActionLoading(true);
    try {
      const updated = await removeItemFromOutfit(id, wardrobeItemId);
      setOutfit(updated);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Unable to remove item from outfit.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    if (!outfit) return;
    const items = [...outfit.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    const orderedIds = items.map((it) => it.wardrobe_item_id);
    setActionLoading(true);
    try {
      const updated = await reorderOutfitItems(id, orderedIds);
      setOutfit(updated);
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Unable to sequence items.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOutfit = async () => {
    if (!outfit) return;
    if (!window.confirm(`Delete outfit "${outfit.name}"? Garments will remain in your wardrobe.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await deleteOutfit(id);
      router.push("/wardrobe/outfits");
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Failed to delete outfit.");
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-ink-black/20 border-t-ink-black animate-spin rounded-full" />
      </div>
    );
  }

  if (error || !outfit) {
    return (
      <div className="min-h-screen bg-warm-ivory py-24 px-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
        <h2 className="text-2xl font-serif text-ink-black mb-2">Ensemble Not Found</h2>
        <p className="text-xs text-ink-black/60 mb-6">{error || "The requested outfit does not exist."}</p>
        <Link
          href="/wardrobe/outfits"
          className="px-6 py-2.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium"
        >
          Return to Ensembles
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory text-ink-black pb-24">
      {/* Masthead */}
      <section className="border-b border-ink-black/10 pt-10 pb-8 bg-warm-ivory/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Back Navigation */}
          <Link
            href="/wardrobe/outfits"
            className="inline-flex items-center text-xs uppercase tracking-widest text-ink-black/60 hover:text-ink-black transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            <span>Return to Curated Ensembles</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
                <span>ENSEMBLE SPECIFICATION</span>
                <span>•</span>
                <span>{outfit.items.length} PIECES</span>
                {outfit.occasion && (
                  <>
                    <span>•</span>
                    <span>{outfit.occasion}</span>
                  </>
                )}
              </div>

              {isEditingMeta ? (
                <form onSubmit={handleSaveMeta} className="space-y-4 max-w-xl">
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-2xl sm:text-4xl font-serif px-3 py-1 bg-transparent border border-ink-black/20 text-ink-black focus:outline-none focus:border-ink-black"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Occasion"
                      value={editOccasion}
                      onChange={(e) => setEditOccasion(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-transparent border border-ink-black/20"
                    />
                    <input
                      type="text"
                      placeholder="Season"
                      value={editSeason}
                      onChange={(e) => setEditSeason(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-transparent border border-ink-black/20"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Ensemble notes..."
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-transparent border border-ink-black/20"
                  />
                  <div className="flex items-center space-x-3">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-1.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium"
                    >
                      Save Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingMeta(false)}
                      className="text-xs uppercase tracking-wider text-ink-black/60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-3xl sm:text-5xl font-serif font-normal text-ink-black tracking-tight">
                      {outfit.name}
                    </h1>
                    <button
                      onClick={() => setIsEditingMeta(true)}
                      className="p-1.5 text-ink-black/40 hover:text-ink-black transition-colors"
                      title="Edit ensemble details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {outfit.description && (
                    <p className="text-xs sm:text-sm text-ink-black/75 font-light max-w-2xl leading-relaxed">
                      {outfit.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={openAddModal}
                disabled={actionLoading}
                className="inline-flex items-center space-x-2 px-5 py-3 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Garment Piece</span>
              </button>

              <button
                onClick={handleDeleteOutfit}
                disabled={actionLoading}
                className="p-3 border border-ink-black/20 text-ink-black/60 hover:text-red-600 hover:border-red-300 transition-colors"
                title="Delete outfit ensemble"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Sequenced Garment Composition */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-10">
        {outfit.items.length === 0 ? (
          <div className="text-center py-24 max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 border border-ink-black/20 rounded-full flex items-center justify-center mx-auto text-ink-black/40">
              <Layers className="w-6 h-6 stroke-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-serif font-normal text-ink-black">No Garments Linked Yet.</h3>
              <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                Add coats, trousers, knitwear, and accessories from your personal archive to curate
                this silhouette.
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90"
            >
              Add First Garment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-widest font-mono text-ink-black/60 mb-2">
              GARMENT SEQUENCE & LAYERING ORDER
            </div>

            <div className="divide-y divide-ink-black/10 border border-ink-black/15 bg-warm-ivory">
              {outfit.items.map((oi, idx) => {
                const item = oi.wardrobe_item;
                return (
                  <div
                    key={oi.id}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-ink-black/[0.02] transition-colors"
                  >
                    {/* Item Index & Visual */}
                    <div className="flex items-center space-x-5">
                      <span className="font-mono text-xs text-ink-black/40 w-6">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div className="relative w-16 h-20 bg-ink-black/5 border border-ink-black/10 overflow-hidden flex-shrink-0">
                        {item?.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover object-top"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] uppercase font-mono text-ink-black/30">
                            No Img
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50 block">
                          {item?.brand || "DRAPE Atelier"} • {item?.category}
                        </span>
                        <h4 className="text-base font-serif font-medium text-ink-black">
                          {item?.name || "Garment Item"}
                        </h4>
                        <div className="flex items-center space-x-3 text-[11px] text-ink-black/60 font-mono">
                          <span>{item?.color}</span>
                          {item?.size && <span>• Size {item.size}</span>}
                          {item?.material && <span>• {item.material}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Reordering Controls & Actions */}
                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <div className="flex items-center border border-ink-black/15">
                        <button
                          onClick={() => handleMoveOrder(idx, "up")}
                          disabled={idx === 0 || actionLoading}
                          className="p-2 hover:bg-ink-black/5 disabled:opacity-20 transition-colors"
                          title="Move Up in sequence"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveOrder(idx, "down")}
                          disabled={idx === outfit.items.length - 1 || actionLoading}
                          className="p-2 border-l border-ink-black/15 hover:bg-ink-black/5 disabled:opacity-20 transition-colors"
                          title="Move Down in sequence"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveItem(oi.wardrobe_item_id)}
                        disabled={actionLoading}
                        className="p-2 border border-ink-black/15 text-ink-black/50 hover:text-red-600 hover:border-red-300 transition-colors"
                        title="Remove from ensemble"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add Garment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-warm-ivory border border-ink-black/20 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-black/10 pb-4">
              <div>
                <h2 className="text-2xl font-serif text-ink-black">Add Garment to Ensemble</h2>
                <p className="text-xs text-ink-black/60 font-light">
                  Select an available piece from your personal wardrobe archive.
                </p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-ink-black/50 hover:text-ink-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingAvailable ? (
              <div className="py-12 text-center text-xs font-mono uppercase tracking-widest text-ink-black/50">
                Scanning wardrobe pieces...
              </div>
            ) : availableItems.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-xs text-ink-black/70 italic">
                  All garments from your wardrobe are already included in this ensemble, or your wardrobe archive is currently empty.
                </p>
                <Link
                  href="/wardrobe/add"
                  className="inline-block px-5 py-2.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium"
                >
                  Archive a New Garment First
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                {availableItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-ink-black/15 bg-warm-ivory flex items-center justify-between hover:border-ink-black/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-ink-black line-clamp-1">{item.name}</div>
                      <div className="text-[10px] uppercase font-mono text-ink-black/50">
                        {item.category} • {item.color}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddItem(item.id)}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-ink-black text-warm-ivory text-[10px] uppercase tracking-wider font-medium hover:bg-ink-black/85 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-ink-black/10 pt-4 flex justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2 text-xs uppercase tracking-wider text-ink-black/70 hover:text-ink-black"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

