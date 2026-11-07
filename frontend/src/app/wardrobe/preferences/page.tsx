"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, SlidersHorizontal, ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  StylistPreferences,
  getStylistPreferences,
  updateStylistPreferences,
} from "@/lib/api";

const STYLE_DIRECTIONS = [
  {
    id: "contemporary_minimal",
    title: "Contemporary Minimal",
    description: "Architectural silhouettes, restrained monochrome tones, and clean unembellished cuts.",
  },
  {
    id: "classic_tailoring",
    title: "Classic Tailoring",
    description: "Sharp pleated trousers, crisp shirting, and refined heritage proportions.",
  },
  {
    id: "relaxed_casual",
    title: "Relaxed Everyday",
    description: "Boxy tees, straight selvedge denim, and effortless modern loungewear.",
  },
  {
    id: "monochrome",
    title: "Monochrome Uniform",
    description: "Strict tonal discipline centered on noir, charcoal, bone white, and midnight navy.",
  },
];

const AVAILABLE_COLORS = [
  { id: "black", label: "Black / Noir", hex: "#111111" },
  { id: "white", label: "White / Ecru", hex: "#FFFFFF" },
  { id: "charcoal", label: "Charcoal Grey", hex: "#374151" },
  { id: "navy", label: "Navy Blue", hex: "#1E293B" },
  { id: "washed blue", label: "Washed Blue Denim", hex: "#64748B" },
  { id: "beige", label: "Sandstone Beige", hex: "#D6CEBF" },
  { id: "olive", label: "Olive Green", hex: "#556B2F" },
  { id: "brown", label: "Cocoa Brown", hex: "#4A3324" },
];

const OCCASIONS = [
  { id: "casual", label: "Casual Everyday" },
  { id: "office", label: "Contemporary Office" },
  { id: "evening", label: "Evening & Atelier" },
  { id: "formal", label: "Formal Gatherings" },
  { id: "weekend", label: "Relaxed Weekend" },
];

export default function StylistPreferencesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [styleDirection, setStyleDirection] = useState<string>("contemporary_minimal");
  const [favoriteOccasions, setFavoriteOccasions] = useState<string[]>(["casual", "office"]);
  const [favoriteColors, setFavoriteColors] = useState<string[]>(["black", "white", "navy", "beige"]);
  const [excludedColors, setExcludedColors] = useState<string[]>([]);
  const [preferredSeason, setPreferredSeason] = useState<string>("all-season");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/preferences");
    } else if (user) {
      getStylistPreferences()
        .then((pref) => {
          setStyleDirection(pref.style_direction || "contemporary_minimal");
          setFavoriteOccasions(pref.favorite_occasions || ["casual", "office"]);
          setFavoriteColors(pref.favorite_colors || ["black", "white", "navy", "beige"]);
          setExcludedColors(pref.excluded_colors || []);
          setPreferredSeason(pref.preferred_season || "all-season");
        })
        .catch((err) => console.error("Failed to load stylist preferences:", err))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  const toggleOccasion = (id: string) => {
    setFavoriteOccasions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  };

  const toggleColor = (id: string) => {
    setFavoriteColors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleExcludedColor = (id: string) => {
    setExcludedColors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    try {
      await updateStylistPreferences({
        style_direction: styleDirection,
        favorite_occasions: favoriteOccasions,
        favorite_colors: favoriteColors,
        excluded_colors: excludedColors,
        preferred_season: preferredSeason,
      });
      setSuccessMessage("Styling preferences saved. Outfit recommendations will now reflect your updated taste profile.");
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      alert(e.detail || e.message || "Failed to update preferences.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-black/20 border-t-[#294BFF] animate-spin rounded-full mx-auto" />
          <p className="text-xs uppercase tracking-widest font-mono text-black/60">
            Loading Preferences...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#111111] pb-24">
      {/* Editorial Header */}
      <section className="border-b border-[#E5DFD3] pt-12 pb-10 bg-[#FAF7F2]/80">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-8">
          <div className="space-y-3">
            <Link
              href="/wardrobe/studio"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#736B5E] hover:text-[#111111] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to DRAPE Studio
            </Link>
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-[#736B5E] pt-2">
              <span>STYLIST PROFILE</span>
              <span>•</span>
              <span>PREFERENCE MATRIX</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif font-normal text-[#111111] tracking-tight">
              Personal Styling Parameters.
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5549] font-light max-w-xl leading-relaxed">
              Fine-tune the recommendation algorithm. Set your foundational aesthetic direction,
              cherished color harmonies, and excluded palettes.
            </p>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <main className="max-w-[1000px] mx-auto px-4 sm:px-8 pt-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-sm text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Style Direction */}
          <div className="space-y-4">
            <div className="border-b border-[#E5DFD3] pb-2">
              <h3 className="text-lg font-serif font-medium text-[#111111]">1. Aesthetic Direction</h3>
              <p className="text-xs text-[#736B5E]">
                Select the overarching design language for your outfits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STYLE_DIRECTIONS.map((dir) => (
                <div
                  key={dir.id}
                  onClick={() => setStyleDirection(dir.id)}
                  className={`cursor-pointer p-5 rounded-sm border transition-all ${
                    styleDirection === dir.id
                      ? "bg-[#FFFFFF] border-[#294BFF] shadow-sm ring-1 ring-[#294BFF]"
                      : "bg-[#FFFFFF]/70 border-[#E5DFD3] hover:border-black/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-serif font-medium text-[#111111]">{dir.title}</h4>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        styleDirection === dir.id
                          ? "border-[#294BFF] bg-[#294BFF]"
                          : "border-black/20"
                      }`}
                    >
                      {styleDirection === dir.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>
                  <p className="text-xs text-[#5C5549] mt-2 leading-relaxed">{dir.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Favorite Colors */}
          <div className="space-y-4">
            <div className="border-b border-[#E5DFD3] pb-2">
              <h3 className="text-lg font-serif font-medium text-[#111111]">2. Favored Color Palette</h3>
              <p className="text-xs text-[#736B5E]">
                The stylist will prioritize these tones when calculating color harmony.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {AVAILABLE_COLORS.map((col) => {
                const isSelected = favoriteColors.includes(col.id);
                return (
                  <button
                    type="button"
                    key={col.id}
                    onClick={() => toggleColor(col.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-[#111111] text-[#F4F0E8] border-[#111111] shadow-xs"
                        : "bg-[#FFFFFF] text-[#5C5549] border-[#E5DFD3] hover:border-black/30"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/15 inline-block shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span>{col.label}</span>
                    {isSelected && <Check className="w-3 h-3 ml-1 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Favorite Occasions */}
          <div className="space-y-4">
            <div className="border-b border-[#E5DFD3] pb-2">
              <h3 className="text-lg font-serif font-medium text-[#111111]">3. Primary Occasions</h3>
              <p className="text-xs text-[#736B5E]">
                Select the everyday environments you most frequently dress for.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {OCCASIONS.map((occ) => {
                const isSelected = favoriteOccasions.includes(occ.id);
                return (
                  <button
                    type="button"
                    key={occ.id}
                    onClick={() => toggleOccasion(occ.id)}
                    className={`px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-sm border transition-all ${
                      isSelected
                        ? "bg-[#294BFF] text-white border-[#294BFF] shadow-xs"
                        : "bg-[#FFFFFF] text-[#5C5549] border-[#E5DFD3] hover:border-black/30"
                    }`}
                  >
                    {occ.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Excluded Colors */}
          <div className="space-y-4">
            <div className="border-b border-[#E5DFD3] pb-2">
              <h3 className="text-lg font-serif font-medium text-[#111111]">4. Excluded Colors (Optional)</h3>
              <p className="text-xs text-[#736B5E]">
                Select any tones you prefer the stylist to actively avoid in recommendation scoring.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {AVAILABLE_COLORS.map((col) => {
                const isExcluded = excludedColors.includes(col.id);
                return (
                  <button
                    type="button"
                    key={col.id}
                    onClick={() => toggleExcludedColor(col.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-xs font-medium transition-all ${
                      isExcluded
                        ? "bg-[#80251A] text-white border-[#80251A] shadow-xs"
                        : "bg-[#FFFFFF] text-[#5C5549] border-[#E5DFD3] hover:border-black/30"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/15 inline-block shrink-0"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span>{col.label}</span>
                    {isExcluded && <span className="text-[10px] ml-1 uppercase">Excluded</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-[#E5DFD3] flex items-center justify-end gap-3">
            <Link
              href="/wardrobe/studio"
              className="px-5 py-2.5 bg-[#FAF7F2] border border-[#D8D0C2] text-[#111111] text-xs uppercase tracking-wider font-medium rounded-sm hover:bg-[#F2EDE4]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#111111] hover:bg-[#222222] text-[#F4F0E8] text-xs uppercase tracking-widest font-medium rounded-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
