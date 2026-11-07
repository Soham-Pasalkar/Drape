"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Heart,
  ThumbsDown,
  Bookmark,
  Check,
  RotateCw,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  Info,
  ShoppingBag,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  OutfitRecommendation,
  ComplementaryProduct,
  generateOutfitRecommendations,
  submitOutfitFeedback,
  getCompleteLookRecommendations,
  createOutfit,
} from "@/lib/api";

const OCCASIONS = [
  { id: "casual", label: "Casual Everyday" },
  { id: "office", label: "Contemporary Office" },
  { id: "evening", label: "Evening & Atelier" },
  { id: "formal", label: "Formal Event" },
  { id: "weekend", label: "Relaxed Weekend" },
];

export default function StylistStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [selectedOccasion, setSelectedOccasion] = useState<string>("casual");
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [gapSuggestions, setGapSuggestions] = useState<ComplementaryProduct[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});
  const [savingOutfitHash, setSavingOutfitHash] = useState<string | null>(null);
  const [savedOutfits, setSavedOutfits] = useState<Set<string>>(new Set());

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [recRes, gapRes] = await Promise.all([
        generateOutfitRecommendations({
          occasion: selectedOccasion,
          limit: 6,
        }),
        getCompleteLookRecommendations(),
      ]);
      setRecommendations(recRes.recommendations);
      setGapSuggestions(gapRes.suggestions);
      setMissingCategories(gapRes.missing_categories);
    } catch (err: unknown) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedOccasion]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/studio");
    } else if (user) {
      fetchRecommendations();
    }
  }, [user, authLoading, router, fetchRecommendations]);

  const handleFeedback = async (
    rec: OutfitRecommendation,
    action: "like" | "dislike" | "worn"
  ) => {
    setFeedbackState((prev) => ({ ...prev, [rec.recommendation_hash]: action }));
    try {
      await submitOutfitFeedback({
        recommendation_hash: rec.recommendation_hash,
        action,
      });
      if (action === "dislike") {
        // Remove from current view
        setRecommendations((prev) =>
          prev.filter((r) => r.recommendation_hash !== rec.recommendation_hash)
        );
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const handleSaveToOutfits = async (rec: OutfitRecommendation) => {
    setSavingOutfitHash(rec.recommendation_hash);
    try {
      // 1. Record feedback
      await submitOutfitFeedback({
        recommendation_hash: rec.recommendation_hash,
        action: "save",
      });

      // 2. Persist as saved Outfit
      const itemIds = rec.items.map((it) => it.wardrobe_item.id);
      await createOutfit({
        name: rec.title,
        occasion: rec.occasion,
        season: rec.season,
        description: rec.stylist_notes,
        item_ids: itemIds,
      });

      setSavedOutfits((prev) => new Set([...Array.from(prev), rec.recommendation_hash]));
    } catch (err) {
      console.error("Failed to save outfit:", err);
    } finally {
      setSavingOutfitHash(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-black/20 border-t-[#294BFF] animate-spin rounded-full mx-auto" />
          <p className="text-xs uppercase tracking-widest font-mono text-black/60">
            Consulting DRAPE Stylist...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111111] pb-24">
      {/* Editorial Header */}
      <section className="border-b border-[#E5DFD3] pt-12 pb-10 bg-[#FAF7F2]/80">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-[#736B5E]">
                <span>DRAPE STUDIO</span>
                <span>•</span>
                <span>PERSONAL FASHION STYLIST</span>
                <span>•</span>
                <span>DETERMINISTIC & EXPLAINABLE</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-serif font-normal text-[#111111] tracking-tight">
                Curated Ensembles.
              </h1>
              <p className="text-xs sm:text-sm text-[#5C5549] font-light max-w-xl leading-relaxed">
                Intelligent outfit synthesis generated exclusively from your owned garments.
                Evaluated against color harmony, silhouette proportions, and occasion balance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/wardrobe/preferences"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] rounded-sm text-xs uppercase tracking-wider text-[#111111] font-medium transition-colors shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#736B5E]" />
                Styling Preferences
              </Link>
              <Link
                href="/wardrobe/outfits"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FAF7F2] hover:bg-[#F2EDE4] border border-[#D8D0C2] rounded-sm text-xs uppercase tracking-wider text-[#111111] font-medium transition-colors shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-[#736B5E]" />
                Saved Outfits
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Stylist Workspace */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 space-y-10">
        {/* Occasion Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DFD3]">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] uppercase tracking-widest text-[#8C8275] font-medium mr-1 shrink-0">
              Occasion:
            </span>
            {OCCASIONS.map((occ) => (
              <button
                key={occ.id}
                onClick={() => setSelectedOccasion(occ.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-sm whitespace-nowrap transition-colors ${
                  selectedOccasion === occ.id
                    ? "bg-[#111111] text-[#F4F0E8] shadow-xs"
                    : "bg-[#F2EDE4] text-[#5C5549] hover:bg-[#EAE4D7]"
                }`}
              >
                {occ.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchRecommendations()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#294BFF] hover:bg-[#203ecc] text-white text-xs uppercase tracking-wider font-medium rounded-sm transition-colors shadow-xs disabled:opacity-50 shrink-0"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate Looks
          </button>
        </div>

        {/* Recommendations Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-4 bg-white/60 p-6 border border-[#E5DFD3]">
                <div className="h-5 bg-black/10 w-2/3" />
                <div className="aspect-[16/9] bg-black/5" />
                <div className="h-4 bg-black/5 w-full" />
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-4 bg-[#F4EFE6]/80 p-8 border border-[#E5DFD3] rounded-sm">
            <div className="w-12 h-12 rounded-full border border-black/20 flex items-center justify-center mx-auto text-[#294BFF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-serif text-[#111111]">More Pieces Needed</h3>
            <p className="text-xs text-[#5C5549] leading-relaxed">
              We need at least a top and a bottom (or a dress) to generate coordinated outfits for{" "}
              <span className="font-medium capitalize">{selectedOccasion}</span>. Add more garments or
              explore our catalog gap analysis below!
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                href="/wardrobe/add"
                className="px-4 py-2 bg-[#111111] text-[#F4F0E8] text-xs uppercase tracking-wider font-medium rounded-sm"
              >
                Add Garment
              </Link>
              <Link
                href="/collections"
                className="px-4 py-2 bg-[#FAF7F2] border border-[#D8D0C2] text-[#111111] text-xs uppercase tracking-wider font-medium rounded-sm hover:bg-[#F2EDE4]"
              >
                Browse Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {recommendations.map((rec) => {
              const currentAction = feedbackState[rec.recommendation_hash];
              const isSaved = savedOutfits.has(rec.recommendation_hash);

              return (
                <div
                  key={rec.id}
                  className="bg-[#FFFFFF] border border-[#E5DFD3] rounded-sm overflow-hidden shadow-xs flex flex-col justify-between hover:border-black/30 transition-all duration-300"
                >
                  <div className="p-6 space-y-5">
                    {/* Header: Score & Occasion Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-[#736B5E] font-medium bg-[#F2EDE4] px-2 py-0.5 rounded-xs">
                          {rec.occasion}
                        </span>
                        <span className="text-xs text-[#C5BDB0]">•</span>
                        <span className="text-[10px] uppercase tracking-widest text-[#8C8275]">
                          {rec.items.length} Pieces
                        </span>
                      </div>

                      {/* Harmony Score Pill */}
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF2FF] border border-[#294BFF]/20 text-[#294BFF] text-xs font-semibold rounded-full"
                        title={`Color: ${rec.score_breakdown.color_harmony * 100}% | Category: ${
                          rec.score_breakdown.category_compatibility * 100
                        }%`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{Math.round(rec.score * 100)}% Harmony</span>
                      </div>
                    </div>

                    {/* Outfit Title */}
                    <h3 className="text-xl font-serif font-medium text-[#111111]">{rec.title}</h3>

                    {/* Garment Visual Breakdown */}
                    <div className="grid grid-cols-2 gap-3 py-2">
                      {rec.items.map((ci) => (
                        <div
                          key={ci.wardrobe_item.id}
                          className="bg-[#FAF7F2] border border-[#E5DFD3] rounded-xs p-2 flex items-center gap-3"
                        >
                          <div className="relative w-14 h-18 bg-[#F2EDE4] shrink-0 rounded-xs overflow-hidden">
                            {ci.wardrobe_item.image_url ? (
                              <Image
                                src={ci.wardrobe_item.image_url}
                                alt={ci.wardrobe_item.name}
                                fill
                                sizes="60px"
                                className="object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-[#8C8275] italic">
                                {ci.role}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] uppercase tracking-wider text-[#8C8275] font-medium block">
                              {ci.role}
                            </span>
                            <h5 className="text-xs font-serif font-medium text-[#111111] truncate">
                              {ci.wardrobe_item.name}
                            </h5>
                            <span className="text-[10px] text-[#736B5E] block mt-0.5 capitalize">
                              {ci.wardrobe_item.color}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Editorial Stylist Notes */}
                    <div className="bg-[#FAF7F2] p-4 rounded-xs border-l-2 border-[#294BFF]">
                      <span className="text-[10px] uppercase tracking-widest text-[#294BFF] font-medium block mb-1">
                        Editorial Stylist Notes
                      </span>
                      <p className="text-xs text-[#4A4235] leading-relaxed italic font-serif">
                        &ldquo;{rec.stylist_notes}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-[#FAF7F2] border-t border-[#E5DFD3] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Like */}
                      <button
                        onClick={() => handleFeedback(rec, "like")}
                        className={`p-2 rounded-xs border transition-colors ${
                          currentAction === "like"
                            ? "bg-[#294BFF] text-white border-[#294BFF]"
                            : "bg-white text-[#736B5E] border-[#D8D0C2] hover:text-[#294BFF]"
                        }`}
                        title="Like this look"
                        aria-label="Like this look"
                      >
                        <Heart className="w-4 h-4" />
                      </button>

                      {/* Dislike */}
                      <button
                        onClick={() => handleFeedback(rec, "dislike")}
                        className={`p-2 rounded-xs border transition-colors ${
                          currentAction === "dislike"
                            ? "bg-[#80251A] text-white border-[#80251A]"
                            : "bg-white text-[#736B5E] border-[#D8D0C2] hover:text-[#80251A]"
                        }`}
                        title="Dismiss look"
                        aria-label="Dismiss look"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>

                      {/* Mark Worn */}
                      <button
                        onClick={() => handleFeedback(rec, "worn")}
                        className={`inline-flex items-center gap-1 px-2.5 py-2 rounded-xs border text-xs uppercase tracking-wider font-medium transition-colors ${
                          currentAction === "worn"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-[#736B5E] border-[#D8D0C2] hover:text-emerald-700"
                        }`}
                        title="Mark as worn today"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Worn Today</span>
                      </button>
                    </div>

                    {/* Save to Outfits Button */}
                    <button
                      onClick={() => handleSaveToOutfits(rec)}
                      disabled={isSaved || savingOutfitHash === rec.recommendation_hash}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xs text-xs uppercase tracking-wider font-medium transition-colors shadow-xs ${
                        isSaved
                          ? "bg-emerald-600 text-white cursor-default"
                          : "bg-[#111111] hover:bg-[#222222] text-[#F4F0E8]"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      {isSaved
                        ? "Saved in Outfits"
                        : savingOutfitHash === rec.recommendation_hash
                        ? "Saving..."
                        : "Save to Outfits"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 2: COMPLETE YOUR LOOK (Catalog Gap Analysis) */}
        {gapSuggestions.length > 0 && (
          <section className="pt-8 border-t border-[#E5DFD3] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-[#294BFF] font-medium">
                  <Sparkles className="w-3 h-3" />
                  <span>WARDROBE GAP ANALYSIS</span>
                </div>
                <h3 className="text-2xl font-serif font-medium text-[#111111] mt-1">
                  Complete Your Look.
                </h3>
                <p className="text-xs text-[#5C5549] mt-1 max-w-xl leading-relaxed">
                  {missingCategories.length > 0
                    ? `Your closet currently lacks ${missingCategories.join(
                        ", "
                      )}. Adding these foundational DRAPE styles will unlock dozens of coordinated combinations.`
                    : "Curated everyday pieces from DRAPE that integrate seamlessly with your owned garments."}
                </p>
              </div>

              <Link
                href="/collections"
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-[#294BFF] font-medium hover:underline shrink-0"
              >
                Browse Full Catalog <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Gap Analysis Product Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {gapSuggestions.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#FFFFFF] border border-[#E5DFD3] rounded-sm p-4 flex flex-col justify-between hover:border-black/30 transition-all shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] w-full bg-[#F2EDE4] rounded-xs overflow-hidden">
                      {prod.image_url ? (
                        <Image
                          src={prod.image_url}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-[#8C8275]">
                          {prod.name}
                        </div>
                      )}

                      {prod.compatible_try_on && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 bg-[#294BFF] text-white text-[9px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full shadow-xs">
                            <Sparkles className="w-2.5 h-2.5" /> 3D Try-On
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#736B5E]">
                        <span>{prod.category}</span>
                        <span className="font-semibold text-[#111111]">${prod.price.toFixed(2)}</span>
                      </div>
                      <h4 className="text-sm font-serif font-medium text-[#111111] line-clamp-1 mt-0.5">
                        {prod.name}
                      </h4>
                      <p className="text-[11px] text-[#5C5549] mt-2 leading-relaxed italic font-serif">
                        &ldquo;{prod.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E5DFD3] flex items-center gap-2">
                    <Link
                      href={`/products/${prod.product_slug}`}
                      className="flex-1 text-center py-2 bg-[#111111] hover:bg-[#222222] text-[#F4F0E8] text-xs uppercase tracking-wider font-medium rounded-xs transition-colors"
                    >
                      View Piece
                    </Link>

                    {prod.compatible_try_on && (
                      <Link
                        href={`/try-on?garment=${prod.id.replace("atelier-", "")}&from=/wardrobe/studio`}
                        className="p-2 bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#294BFF] rounded-xs border border-[#294BFF]/20"
                        title="Try On in 3D"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
