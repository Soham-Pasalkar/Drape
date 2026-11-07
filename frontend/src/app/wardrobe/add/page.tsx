"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { createWardrobeItem, WardrobeItemCreatePayload } from "@/lib/api";

const CATEGORIES = [
  { value: "coats", label: "Coats & Outerwear" },
  { value: "jackets", label: "Blazers & Jackets" },
  { value: "shirts", label: "Shirts & Tops" },
  { value: "trousers", label: "Trousers & Bottoms" },
  { value: "knitwear", label: "Knitwear & Sweaters" },
  { value: "accessories", label: "Accessories & Accents" },
];

const SEASONS = [
  { value: "all-season", label: "All-Season Core" },
  { value: "autumn", label: "Autumn" },
  { value: "winter", label: "Winter Atelier" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer Resort" },
];

const OCCASIONS = [
  { value: "atelier", label: "Atelier & Signature" },
  { value: "formal", label: "Black Tie & Formal" },
  { value: "evening", label: "Evening & Cocktails" },
  { value: "business", label: "Tailored Business" },
  { value: "casual", label: "Relaxed Casual" },
];

export default function AddWardrobeItemPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<WardrobeItemCreatePayload>({
    name: "",
    brand: "DRAPE Atelier",
    category: "coats",
    subcategory: "",
    color: "",
    secondary_color: "",
    size: "",
    material: "",
    season: "all-season",
    occasion: "atelier",
    image_url: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.color.trim()) {
      setError("Please provide both a garment name and a primary color.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createWardrobeItem({
        ...formData,
        subcategory: formData.subcategory?.trim() || undefined,
        secondary_color: formData.secondary_color?.trim() || undefined,
        size: formData.size?.trim() || undefined,
        material: formData.material?.trim() || undefined,
        image_url: formData.image_url?.trim() || undefined,
        description: formData.description?.trim() || undefined,
      });
      router.push("/wardrobe");
    } catch (err: unknown) {
      const e = err as { detail?: string; message?: string };
      setError(e.detail || e.message || "Unable to save garment.");
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-warm-ivory flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-ink-black/20 border-t-ink-black animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-ivory text-ink-black py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/wardrobe"
          className="inline-flex items-center text-xs uppercase tracking-widest text-ink-black/60 hover:text-ink-black transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2" />
          <span>Return to Archive</span>
        </Link>

        {/* Masthead */}
        <div className="border-b border-ink-black/10 pb-6 mb-8 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
            PERSONAL VAULT • INTAKE SPECIFICATION
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-normal text-ink-black">
            Catalog a Garment.
          </h1>
          <p className="text-xs sm:text-sm text-ink-black/70 font-light">
            Record details for personal pieces you own. Your archive remains strictly private.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-900 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Garment Intake Form */}
        <form onSubmit={handleSubmit} className="space-y-8 bg-warm-ivory/80 border border-ink-black/15 p-6 sm:p-10 shadow-sm">
          {/* Core Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-black border-b border-ink-black/10 pb-2">
              1. Garment Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Garment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Sculpted Double-Faced Cashmere Coat"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Brand or Atelier Label
                </label>
                <input
                  type="text"
                  name="brand"
                  placeholder="e.g. DRAPE Atelier, Loro Piana"
                  value={formData.brand || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black uppercase"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  placeholder="e.g. Trench, Kimono, Oxford"
                  value={formData.subcategory || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Sizing Specification
                </label>
                <input
                  type="text"
                  name="size"
                  placeholder="e.g. M, 48 EU, 32 Waist"
                  value={formData.size || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>
            </div>
          </div>

          {/* Color & Material */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-black border-b border-ink-black/10 pb-2">
              2. Palette & Composition
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Primary Color <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="color"
                  required
                  placeholder="e.g. Noir, Espresso, Charcoal, Camel"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Secondary Color / Accent
                </label>
                <input
                  type="text"
                  name="secondary_color"
                  placeholder="e.g. Gold Hardware, Ivory Trim"
                  value={formData.secondary_color || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Fabric Composition / Material
                </label>
                <input
                  type="text"
                  name="material"
                  placeholder="e.g. 100% Italian Virgin Wool (480 GSM), Silk Habotai"
                  value={formData.material || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>
            </div>
          </div>

          {/* Context & Imagery */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-black border-b border-ink-black/10 pb-2">
              3. Occasion & Visual Representation
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Target Season
                </label>
                <select
                  name="season"
                  value={formData.season || "all-season"}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black uppercase"
                >
                  {SEASONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Occasion
                </label>
                <select
                  name="occasion"
                  value={formData.occasion || "atelier"}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black uppercase"
                >
                  {OCCASIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Direct Imagery URL
                </label>
                <input
                  type="url"
                  name="image_url"
                  placeholder="https://... or /images/..."
                  value={formData.image_url || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] uppercase tracking-widest font-medium text-ink-black/80">
                  Styling Notes / Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Personal fit observations, silhouette drape, or tailoring adjustments..."
                  value={formData.description || ""}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-transparent border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-ink-black/10 flex items-center justify-end space-x-4">
            <Link
              href="/wardrobe"
              className="px-5 py-3 text-xs uppercase tracking-wider font-medium text-ink-black/70 hover:text-ink-black transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-ink-black text-warm-ivory text-xs uppercase tracking-wider font-medium hover:bg-ink-black/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? "Archiving..." : "Archive Garment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

