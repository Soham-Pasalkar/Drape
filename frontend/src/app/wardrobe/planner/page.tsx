"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Shirt,
  X,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  OutfitPlan,
  WardrobeItem,
  getOutfitPlans,
  createOutfitPlan,
  deleteOutfitPlan,
  markPlanWorn,
  getWardrobeItems,
} from "@/lib/api";

const OCCASIONS = ["casual", "office", "evening", "formal", "weekend"];

export default function OutfitPlannerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [plans, setPlans] = useState<OutfitPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("planned"); // planned, worn, all

  // Modal: Plan an Outfit
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [planDate, setPlanDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [planOccasion, setPlanOccasion] = useState<string>("office");
  const [planNotes, setPlanNotes] = useState<string>("");
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getOutfitPlans(
        statusFilter === "all" ? undefined : { status: statusFilter }
      );
      setPlans(res.plans);
    } catch (err) {
      console.error("Failed to load outfit plans:", err);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/planner");
    } else if (user) {
      fetchPlans();
    }
  }, [user, authLoading, router, fetchPlans]);

  const loadWardrobeForModal = async () => {
    try {
      const res = await getWardrobeItems({ limit: 100 });
      setWardrobeItems(res.items);
    } catch (err) {
      console.error("Failed to load wardrobe items for planner:", err);
    }
  };

  const handleOpenPlanModal = () => {
    loadWardrobeForModal();
    setSelectedItemIds([]);
    setPlanDate(new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setPlanOccasion("office");
    setPlanNotes("");
    setIsPlanModalOpen(true);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) {
      alert("Please select at least one garment from your wardrobe.");
      return;
    }
    setSubmittingPlan(true);
    try {
      await createOutfitPlan({
        plan_date: planDate,
        occasion: planOccasion,
        notes: planNotes || undefined,
        wardrobe_item_ids: selectedItemIds,
      });
      setIsPlanModalOpen(false);
      setToastMessage("Outfit plan successfully scheduled.");
      setTimeout(() => setToastMessage(null), 3000);
      fetchPlans();
    } catch (err) {
      console.error("Failed to schedule outfit plan:", err);
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleMarkWorn = async (planId: string) => {
    try {
      await markPlanWorn(planId);
      setPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, status: "worn" } : p))
      );
      setToastMessage("Plan marked as worn and archived into your Wear Diary.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error("Failed to mark plan as worn:", err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled outfit?")) return;
    try {
      await deleteOutfitPlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      setToastMessage("Scheduled outfit removed.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to delete outfit plan:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-ink-black selection:bg-electric-blue selection:text-white pb-32">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-ink-black text-warm-ivory px-6 py-3 rounded-full text-xs font-mono uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Sub-nav */}
      <section className="border-b border-ink-black/10 bg-warm-ivory pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-ink-black/10">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50 mb-2">
                <Link href="/wardrobe/studio" className="hover:text-electric-blue">
                  DRAPE Studio
                </Link>
                <span>/</span>
                <span className="text-electric-blue font-semibold">Outfit Planner</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black">
                Upcoming Outfit Schedule
              </h1>
              <p className="mt-2 text-sm text-ink-black/70 max-w-xl font-light leading-relaxed">
                Design and assign ensembles to upcoming dates, client presentations, and travel itineraries with seamless conversion into your permanent wear diary.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenPlanModal}
                className="px-5 py-2.5 bg-electric-blue hover:bg-[#1E3ECC] text-white text-xs font-mono uppercase tracking-widest rounded-full transition-all flex items-center gap-2 shadow-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule Outfit</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 pt-10 space-y-10">
        {/* Filter Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-ink-black/10">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase">
            <span className="text-ink-black/50">Status:</span>
            {[
              { label: "Upcoming (Planned)", val: "planned" },
              { label: "Completed (Worn)", val: "worn" },
              { label: "All Plans", val: "all" },
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => setStatusFilter(s.val)}
                className={`px-3.5 py-1.5 rounded-full transition-colors ${
                  statusFilter === s.val
                    ? "bg-ink-black text-warm-ivory font-semibold"
                    : "bg-white hover:bg-ink-black/5 text-ink-black/70 border border-ink-black/10"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-ink-black/50">
            {plans.length} {plans.length === 1 ? "Plan" : "Plans"}
          </span>
        </div>

        {/* Plans Feed */}
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-ink-black/50">
            Loading scheduled plans...
          </div>
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isWorn = plan.status === "worn";
              const targetDate = new Date(plan.plan_date + "T00:00:00");
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil(
                (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              let badgeText = `${diffDays} days away`;
              if (diffDays === 0) badgeText = "Today";
              else if (diffDays === 1) badgeText = "Tomorrow";
              else if (diffDays < 0) badgeText = `${Math.abs(diffDays)} days ago`;

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-ink-black/10 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {isWorn && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[9px] font-mono uppercase tracking-widest px-3 py-0.5 rounded-bl">
                      Worn & Recorded
                    </div>
                  )}

                  <div>
                    {/* Date and Occasion Badge */}
                    <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
                      <div>
                        <span className="text-electric-blue font-semibold block">
                          {targetDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {!isWorn && (
                          <span className="text-[10px] text-ink-black/50">
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-warm-ivory border border-ink-black/10 uppercase rounded text-ink-black/70">
                        {plan.occasion || "Everyday"}
                      </span>
                    </div>

                    {/* Garment Visual Thumbnails */}
                    <div className="grid grid-cols-2 gap-2 mb-3 bg-warm-ivory/30 p-2.5 rounded-lg border border-ink-black/5">
                      {plan.items.map((it, idx) => (
                        <div key={idx} className="text-center">
                          <div className="relative aspect-[3/4] w-full rounded bg-white overflow-hidden mb-1 border border-ink-black/5">
                            {it.image_url ? (
                              <Image
                                src={it.image_url}
                                alt={it.name}
                                fill
                                sizes="20vw"
                                className="object-contain p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-ink-black/20">
                                <Shirt className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-medium text-ink-black truncate">
                            {it.name}
                          </p>
                          <p className="text-[9px] font-mono text-ink-black/50 uppercase">
                            {it.color} · {it.category}
                          </p>
                        </div>
                      ))}
                    </div>

                    {plan.notes && (
                      <p className="text-xs text-ink-black/70 font-light italic line-clamp-2">
                        &ldquo;{plan.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-ink-black/10 flex items-center justify-between">
                    {!isWorn ? (
                      <button
                        onClick={() => handleMarkWorn(plan.id)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono uppercase tracking-wider rounded-full transition-colors flex items-center gap-1.5 font-medium shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark As Worn</span>
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Recorded in Diary</span>
                      </span>
                    )}

                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-ink-black/40 hover:text-rose-600 transition-colors p-1"
                      title="Cancel plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-xl border border-ink-black/10 text-xs font-mono text-ink-black/50">
            No scheduled outfit plans in this view. Click &ldquo;Schedule Outfit&rdquo; to plan an upcoming look.
          </div>
        )}
      </main>

      {/* Plan Outfit Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 lg:p-8 shadow-2xl border border-ink-black/15 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-ink-black/10">
              <h3 className="font-serif text-xl font-light text-ink-black">
                Schedule Outfit For Upcoming Date
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 text-ink-black/50 hover:text-ink-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="mt-6 space-y-5">
              {/* Target Date */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  className="w-full px-4 py-2 border border-ink-black/20 rounded-lg text-sm font-mono focus:border-electric-blue focus:outline-hidden"
                  required
                />
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-1">
                  Occasion Classification
                </label>
                <select
                  value={planOccasion}
                  onChange={(e) => setPlanOccasion(e.target.value)}
                  className="w-full px-4 py-2 border border-ink-black/20 rounded-lg text-sm capitalize font-mono focus:border-electric-blue focus:outline-hidden"
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
              </div>

              {/* Garment Selector */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-2">
                  Select Garments To Assemble ({selectedItemIds.length} selected)
                </label>
                <div className="grid grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-2 bg-warm-ivory/30 border border-ink-black/10 rounded-lg">
                  {wardrobeItems.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIds((prev) =>
                            isSelected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          );
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-ink-black text-warm-ivory border-ink-black"
                            : "bg-white text-ink-black border-ink-black/10 hover:border-ink-black/30"
                        }`}
                      >
                        <p className="text-[11px] font-medium truncate">{item.name}</p>
                        <p className="text-[9px] font-mono uppercase opacity-70">
                          {item.color} · {item.category}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-1">
                  Occasion Context & Notes (Optional)
                </label>
                <textarea
                  value={planNotes}
                  onChange={(e) => setPlanNotes(e.target.value)}
                  placeholder="e.g., Executive design review and client reception..."
                  className="w-full px-4 py-2 border border-ink-black/20 rounded-lg text-xs font-light focus:border-electric-blue focus:outline-hidden"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-ink-black/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-ink-black/70 hover:text-ink-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan || selectedItemIds.length === 0}
                  className="px-6 py-2.5 bg-electric-blue hover:bg-[#1E3ECC] text-white text-xs font-mono uppercase tracking-widest rounded-full transition-colors font-semibold disabled:opacity-50"
                >
                  {submittingPlan ? "Scheduling..." : "Save Scheduled Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

