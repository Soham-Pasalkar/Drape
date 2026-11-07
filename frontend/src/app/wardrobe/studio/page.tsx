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
  ChevronRight,
  Info,
  Calendar,
  Clock,
  Shirt,
  Layers,
  Compass,
  SlidersHorizontal,
  Eye,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Palette,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  DailyStylistResponse,
  OutfitRecommendation,
  ComplementaryProduct,
  WardrobeRotationResponse,
  StyleProfileResponse,
  getDailyStylist,
  generateOutfitRecommendations,
  submitOutfitFeedback,
  getCompleteLookRecommendations,
  createOutfit,
  createWearLog,
  getWardrobeRotation,
  getStyleProfile,
  updateStylistPreferences,
  getStylistPreferences,
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

  const [dailyData, setDailyData] = useState<DailyStylistResponse | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string>("casual");
  const [occasionRecs, setOccasionRecs] = useState<OutfitRecommendation[]>([]);
  const [gapSuggestions, setGapSuggestions] = useState<ComplementaryProduct[]>([]);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [rotationData, setRotationData] = useState<WardrobeRotationResponse | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfileResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshingDaily, setRefreshingDaily] = useState<boolean>(false);
  const [refreshingOccasion, setRefreshingOccasion] = useState<boolean>(false);

  const [wornOutfits, setWornOutfits] = useState<Set<string>>(new Set());
  const [savedOutfits, setSavedOutfits] = useState<Set<string>>(new Set());
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const [rotationStrategy, setRotationStrategy] = useState<string>("balanced");
  const [updatingStrategy, setUpdatingStrategy] = useState<boolean>(false);

  // Load studio data
  const loadStudioData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [daily, occRes, gapRes, rotation, profile, prefs] = await Promise.all([
        getDailyStylist(),
        generateOutfitRecommendations({ occasion: selectedOccasion, limit: 6 }),
        getCompleteLookRecommendations(),
        getWardrobeRotation(),
        getStyleProfile(),
        getStylistPreferences(),
      ]);

      setDailyData(daily);
      setOccasionRecs(occRes.recommendations);
      setGapSuggestions(gapRes.suggestions);
      setMissingCategories(gapRes.missing_categories);
      setRotationData(rotation);
      setStyleProfile(profile);
      if (prefs.rotation_strategy) {
        setRotationStrategy(prefs.rotation_strategy);
      }
    } catch (err: unknown) {
      console.error("Failed to load DRAPE Studio data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedOccasion]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/studio");
    } else if (user) {
      loadStudioData();
    }
  }, [user, authLoading, router, loadStudioData]);

  // Occasion switch
  const handleOccasionChange = async (occId: string) => {
    setSelectedOccasion(occId);
    setRefreshingOccasion(true);
    try {
      const res = await generateOutfitRecommendations({ occasion: occId, limit: 6 });
      setOccasionRecs(res.recommendations);
    } catch (err) {
      console.error("Failed to switch occasion:", err);
    } finally {
      setRefreshingOccasion(false);
    }
  };

  // Rotation strategy update
  const handleStrategyChange = async (newStrat: string) => {
    setRotationStrategy(newStrat);
    setUpdatingStrategy(true);
    try {
      await updateStylistPreferences({ rotation_strategy: newStrat });
      // Refresh recommendations to reflect updated repetition weighting
      const [daily, occRes, rotation] = await Promise.all([
        getDailyStylist(),
        generateOutfitRecommendations({ occasion: selectedOccasion, limit: 6 }),
        getWardrobeRotation(),
      ]);
      setDailyData(daily);
      setOccasionRecs(occRes.recommendations);
      setRotationData(rotation);
      setActionSuccessMessage(`Rotation strategy updated to ${newStrat.replace("_", " ")}`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to update rotation strategy:", err);
    } finally {
      setUpdatingStrategy(false);
    }
  };

  // Log outfit as worn today
  const handleWearToday = async (rec: OutfitRecommendation) => {
    const itemIds = rec.items.map((it) => it.wardrobe_item.id);
    const hash = rec.recommendation_hash;
    setWornOutfits((prev) => new Set(prev).add(hash));

    try {
      await createWearLog({
        wear_date: new Date().toISOString().split("T")[0],
        occasion: rec.occasion,
        notes: `Logged from DRAPE Studio: ${rec.title}`,
        wardrobe_item_ids: itemIds,
      });

      // Submit feedback as 'worn'
      await submitOutfitFeedback({
        recommendation_hash: hash,
        action: "worn",
      });

      // Refresh rotation analytics
      const rot = await getWardrobeRotation();
      setRotationData(rot);

      setActionSuccessMessage(`Outfit marked as worn today and recorded to your Wear Diary.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Failed to record wear log:", err);
    }
  };

  // Save outfit to saved collection
  const handleSaveOutfit = async (rec: OutfitRecommendation) => {
    const hash = rec.recommendation_hash;
    setSavedOutfits((prev) => new Set(prev).add(hash));
    try {
      await createOutfit({
        name: rec.title,
        description: rec.stylist_notes,
        occasion: rec.occasion,
        season: rec.season,
        item_ids: rec.items.map((it) => it.wardrobe_item.id),
      });
      await submitOutfitFeedback({
        recommendation_hash: hash,
        action: "save",
      });
      setActionSuccessMessage(`Ensemble saved to your permanent outfit archive.`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save outfit:", err);
    }
  };

  // Feedback (like / dislike)
  const handleFeedback = async (
    rec: OutfitRecommendation,
    action: "like" | "dislike"
  ) => {
    setFeedbackState((prev) => ({ ...prev, [rec.recommendation_hash]: action }));
    try {
      await submitOutfitFeedback({
        recommendation_hash: rec.recommendation_hash,
        action,
      });
      if (action === "dislike") {
        setOccasionRecs((prev) =>
          prev.filter((r) => r.recommendation_hash !== rec.recommendation_hash)
        );
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  // Re-generate daily recommendation
  const handleRefreshDaily = async () => {
    setRefreshingDaily(true);
    try {
      const daily = await getDailyStylist();
      setDailyData(daily);
    } catch (err) {
      console.error("Failed to refresh daily styling:", err);
    } finally {
      setRefreshingDaily(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-ink-black selection:bg-electric-blue selection:text-white pb-32">
      {/* Toast Notification Banner */}
      {actionSuccessMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-ink-black text-warm-ivory px-6 py-3 rounded-full text-xs font-mono uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Hero Header & Subnavigation */}
      <section className="border-b border-ink-black/10 bg-warm-ivory pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          {/* Breadcrumb & Identity */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-ink-black/10">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50 mb-2">
                <span>The Atelier</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-electric-blue font-semibold">DRAPE Studio</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black">
                Personal Fashion Stylist
              </h1>
              <p className="mt-2 text-sm text-ink-black/70 max-w-xl font-light leading-relaxed">
                Intelligent ensemble curation, daily wardrobe rotation, and wear history tracking powered exclusively by the garments in your personal vault.
              </p>
            </div>

            {/* Studio Navigation Pills */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
              <span className="px-4 py-2 bg-ink-black text-warm-ivory rounded-full">
                DRAPE Studio
              </span>
              <Link
                href="/wardrobe"
                className="px-4 py-2 bg-white hover:bg-ink-black/5 text-ink-black/80 border border-ink-black/10 rounded-full transition-colors flex items-center gap-1.5"
              >
                <Shirt className="w-3.5 h-3.5 text-ink-black/50" />
                <span>The Armoire</span>
              </Link>
              <Link
                href="/wardrobe/history"
                className="px-4 py-2 bg-white hover:bg-ink-black/5 text-ink-black/80 border border-ink-black/10 rounded-full transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-ink-black/50" />
                <span>Wear Diary</span>
              </Link>
              <Link
                href="/wardrobe/planner"
                className="px-4 py-2 bg-white hover:bg-ink-black/5 text-ink-black/80 border border-ink-black/10 rounded-full transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-ink-black/50" />
                <span>Outfit Planner</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Studio Body */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 pt-10 space-y-16">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-2 border-electric-blue border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs uppercase tracking-widest font-mono text-ink-black/50">
              Consulting DRAPE Stylist & Wardrobe Vault...
            </p>
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* 1. DAILY STYLIST HERO: "WHAT SHOULD I WEAR TODAY?" */}
            {/* ============================================================ */}
            <section className="bg-white border border-ink-black/10 rounded-2xl p-6 lg:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-electric-blue/5 via-transparent to-transparent pointer-events-none" />

              {/* Greeting & Date Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-ink-black/10">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] text-[#294BFF] text-[10px] font-mono uppercase tracking-widest rounded-full font-medium">
                      <Sparkles className="w-3 h-3" />
                      Daily Atelier Briefing
                    </span>
                    <span className="text-xs text-ink-black/50 font-mono">
                      {dailyData?.date_display}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl lg:text-3xl font-light text-ink-black mt-2">
                    {dailyData?.greeting}
                  </h2>
                  <p className="text-xs text-ink-black/70 mt-1 max-w-xl font-light">
                    {dailyData?.occasion_context} — {dailyData?.weather_summary}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRefreshDaily}
                    disabled={refreshingDaily}
                    className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-ink-black/70 hover:text-ink-black border border-ink-black/15 hover:border-ink-black/40 rounded-full transition-colors flex items-center gap-2 bg-white"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${refreshingDaily ? "animate-spin" : ""}`} />
                    <span>Shuffle Pick</span>
                  </button>
                </div>
              </div>

              {/* Recent Wear Alert */}
              {dailyData?.recent_wear_alert && (
                <div className="mt-6 p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-center gap-3 font-mono">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{dailyData.recent_wear_alert}</span>
                </div>
              )}

              {/* Today's Curated Pick Card */}
              {dailyData?.todays_pick ? (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left: Garments Visual Ensemble */}
                  <div className="lg:col-span-7 bg-[#F7F5F0] rounded-xl p-6 border border-ink-black/10">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                        Ensemble Composition ({dailyData.todays_pick.items.length} Pieces)
                      </span>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-ink-black text-warm-ivory text-xs font-mono font-medium rounded-full">
                        <span>{Math.round(dailyData.todays_pick.score * 100)}%</span>
                        <span className="text-[10px] text-warm-ivory/60 font-light">HARMONY</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {dailyData.todays_pick.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="group relative bg-white border border-ink-black/10 rounded-lg p-3 text-center transition-all hover:shadow-md"
                        >
                          <div className="relative aspect-[3/4] w-full rounded bg-warm-ivory/40 overflow-hidden mb-2.5">
                            {it.wardrobe_item.image_url ? (
                              <Image
                                src={it.wardrobe_item.image_url}
                                alt={it.wardrobe_item.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-ink-black/30">
                                <Shirt className="w-8 h-8" />
                              </div>
                            )}
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-ink-black/75 backdrop-blur-sm text-white text-[9px] uppercase font-mono tracking-wider rounded">
                              {it.role}
                            </span>
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs font-medium text-ink-black truncate">
                              {it.wardrobe_item.name}
                            </h4>
                            <p className="text-[10px] font-mono text-ink-black/50 mt-0.5 uppercase tracking-wide">
                              {it.wardrobe_item.color} · {it.wardrobe_item.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Stylist Commentary & Quick Action Bar */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-electric-blue font-semibold">
                          Recommended For Today
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl font-normal text-ink-black">
                        {dailyData.todays_pick.title}
                      </h3>
                      <p className="text-xs text-ink-black/75 mt-3 leading-relaxed font-light">
                        {dailyData.todays_pick.stylist_notes}
                      </p>

                      {/* Explainability Tags */}
                      {dailyData.todays_pick.reasons && dailyData.todays_pick.reasons.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {dailyData.todays_pick.reasons.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-2.5 py-1 bg-ink-black/5 border border-ink-black/10 text-[10px] font-mono uppercase tracking-wider text-ink-black/70 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Stylist Tip Pill */}
                      <div className="mt-5 p-3 bg-warm-ivory/60 border border-ink-black/10 rounded-lg">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50 block mb-1">
                          Atelier Principle
                        </span>
                        <p className="text-xs text-ink-black/80 italic font-serif">
                          &ldquo;{dailyData.stylist_tip}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="space-y-3 pt-4 border-t border-ink-black/10">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleWearToday(dailyData.todays_pick!)}
                          disabled={wornOutfits.has(dailyData.todays_pick.recommendation_hash)}
                          className={`flex-1 py-3 px-6 rounded-full text-xs font-mono uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                            wornOutfits.has(dailyData.todays_pick.recommendation_hash)
                              ? "bg-emerald-600 text-white cursor-default"
                              : "bg-electric-blue hover:bg-[#1E3ECC] text-white"
                          }`}
                        >
                          {wornOutfits.has(dailyData.todays_pick.recommendation_hash) ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Worn Today</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Wear Today</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSaveOutfit(dailyData.todays_pick!)}
                          disabled={savedOutfits.has(dailyData.todays_pick.recommendation_hash)}
                          title="Save to permanent outfits"
                          className="p-3 border border-ink-black/15 hover:border-ink-black/40 rounded-full text-ink-black transition-colors"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              savedOutfits.has(dailyData.todays_pick.recommendation_hash)
                                ? "fill-ink-black"
                                : ""
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleFeedback(dailyData.todays_pick!, "like")}
                          title="Like this ensemble"
                          className="p-3 border border-ink-black/15 hover:border-ink-black/40 rounded-full text-ink-black transition-colors"
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              feedbackState[dailyData.todays_pick.recommendation_hash] === "like"
                                ? "fill-rose-500 text-rose-500"
                                : ""
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleFeedback(dailyData.todays_pick!, "dislike")}
                          title="Dislike / downweight"
                          className="p-3 border border-ink-black/15 hover:border-ink-black/40 rounded-full text-ink-black transition-colors"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-ink-black/50 font-mono">
                        <Link
                          href="/try-on"
                          className="hover:text-electric-blue transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>3D Virtual Try-On</span>
                        </Link>
                        <Link
                          href="/wardrobe/planner"
                          className="hover:text-electric-blue transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Schedule in Planner</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-ink-black/50 text-xs font-mono">
                  No daily combination generated. Please ensure you have tops and bottoms in your wardrobe.
                </div>
              )}
            </section>

            {/* ============================================================ */}
            {/* 2. CURATED OCCASION COLLECTIONS */}
            {/* ============================================================ */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                    Occasion Intelligence
                  </span>
                  <h2 className="font-serif text-2xl lg:text-3xl font-light text-ink-black mt-1">
                    Curated Looks For Any Occasion
                  </h2>
                </div>

                {/* Occasion Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {OCCASIONS.map((occ) => (
                    <button
                      key={occ.id}
                      onClick={() => handleOccasionChange(occ.id)}
                      className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider rounded-full transition-all ${
                        selectedOccasion === occ.id
                          ? "bg-ink-black text-warm-ivory shadow-sm font-medium"
                          : "bg-white hover:bg-ink-black/5 text-ink-black/70 border border-ink-black/10"
                      }`}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation Cards Grid */}
              {refreshingOccasion ? (
                <div className="py-20 text-center text-xs font-mono text-ink-black/50">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-electric-blue" />
                  Generating combinations for {selectedOccasion}...
                </div>
              ) : occasionRecs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {occasionRecs.map((rec) => {
                    const isWorn = wornOutfits.has(rec.recommendation_hash);
                    const isSaved = savedOutfits.has(rec.recommendation_hash);

                    return (
                      <div
                        key={rec.id}
                        className="bg-white border border-ink-black/10 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          {/* Score and Occasion Badge */}
                          <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
                            <span className="uppercase tracking-widest text-ink-black/50">
                              {rec.occasion}
                            </span>
                            <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#294BFF] font-semibold rounded-full">
                              {Math.round(rec.score * 100)}% Match
                            </span>
                          </div>

                          {/* Garments Visual Row */}
                          <div className="grid grid-cols-2 gap-2 mb-4 bg-warm-ivory/30 p-2.5 rounded-lg border border-ink-black/5">
                            {rec.items.map((item, iIdx) => (
                              <div key={iIdx} className="text-center">
                                <div className="relative aspect-[3/4] w-full rounded bg-white overflow-hidden mb-1.5 border border-ink-black/5">
                                  {item.wardrobe_item.image_url ? (
                                    <Image
                                      src={item.wardrobe_item.image_url}
                                      alt={item.wardrobe_item.name}
                                      fill
                                      sizes="(max-width: 768px) 33vw, 20vw"
                                      className="object-contain p-1"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-ink-black/20">
                                      <Shirt className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] font-medium text-ink-black truncate">
                                  {item.wardrobe_item.name}
                                </p>
                                <p className="text-[9px] font-mono text-ink-black/50 uppercase">
                                  {item.wardrobe_item.color}
                                </p>
                              </div>
                            ))}
                          </div>

                          <h3 className="font-serif text-lg font-light text-ink-black mb-1">
                            {rec.title}
                          </h3>
                          <p className="text-xs text-ink-black/70 leading-relaxed font-light line-clamp-2">
                            {rec.stylist_notes}
                          </p>

                          {/* Reasons */}
                          {rec.reasons && rec.reasons.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {rec.reasons.slice(0, 2).map((r, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[9px] font-mono px-2 py-0.5 bg-ink-black/5 rounded text-ink-black/60"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-5 pt-3 border-t border-ink-black/10 flex items-center justify-between">
                          <button
                            onClick={() => handleWearToday(rec)}
                            disabled={isWorn}
                            className={`text-xs font-mono uppercase tracking-wider px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${
                              isWorn
                                ? "bg-emerald-600 text-white font-medium"
                                : "bg-ink-black hover:bg-electric-blue text-warm-ivory"
                            }`}
                          >
                            {isWorn ? <Check className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{isWorn ? "Worn" : "Wear"}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSaveOutfit(rec)}
                              disabled={isSaved}
                              title="Save ensemble"
                              className="p-1.5 hover:text-electric-blue text-ink-black/60 transition-colors"
                            >
                              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-ink-black text-ink-black" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleFeedback(rec, "like")}
                              title="Like"
                              className="p-1.5 hover:text-rose-500 text-ink-black/60 transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleFeedback(rec, "dislike")}
                              title="Dislike"
                              className="p-1.5 hover:text-ink-black text-ink-black/40 transition-colors"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 bg-white rounded-xl border border-ink-black/10 text-center text-xs font-mono text-ink-black/50">
                  No recommendations found for &lsquo;{selectedOccasion}&rsquo;. Add more garments to your vault to expand options.
                </div>
              )}
            </section>

            {/* ============================================================ */}
            {/* 3. WARDROBE ROTATION & GARMENT HEALTH */}
            {/* ============================================================ */}
            {rotationData && (
              <section className="bg-white border border-ink-black/10 rounded-2xl p-6 lg:p-10 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-ink-black/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                      Wardrobe Utilization Analytics
                    </span>
                    <h2 className="font-serif text-2xl lg:text-3xl font-light text-ink-black mt-1">
                      Rotation Health & Garment Circulation
                    </h2>
                    <p className="text-xs text-ink-black/70 mt-1 max-w-xl font-light">
                      Track which pieces are in active circulation and surface unworn garments to maintain a balanced, sustainable wardrobe rotation.
                    </p>
                  </div>

                  {/* Rotation Strategy Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-[11px] font-mono text-ink-black/60 uppercase">
                      Strategy:
                    </span>
                    <div className="inline-flex p-1 bg-warm-ivory border border-ink-black/10 rounded-full font-mono text-[10px] uppercase">
                      {(["balanced", "avoid_recent", "max_variety"] as const).map((strat) => (
                        <button
                          key={strat}
                          onClick={() => handleStrategyChange(strat)}
                          disabled={updatingStrategy}
                          className={`px-3 py-1 rounded-full transition-all ${
                            rotationStrategy === strat
                              ? "bg-ink-black text-warm-ivory font-semibold shadow-xs"
                              : "text-ink-black/70 hover:text-ink-black"
                          }`}
                        >
                          {strat.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-warm-ivory/40 rounded-xl border border-ink-black/5">
                    <span className="text-[10px] font-mono text-ink-black/50 uppercase tracking-widest block">
                      Total Wears Logged
                    </span>
                    <p className="font-serif text-2xl font-light text-ink-black mt-1">
                      {rotationData.total_logged_wears}
                    </p>
                  </div>
                  <div className="p-4 bg-warm-ivory/40 rounded-xl border border-ink-black/5">
                    <span className="text-[10px] font-mono text-ink-black/50 uppercase tracking-widest block">
                      Active Strategy
                    </span>
                    <p className="font-serif text-2xl font-light text-ink-black mt-1 capitalize">
                      {rotationData.rotation_strategy.replace("_", " ")}
                    </p>
                  </div>
                  <div className="p-4 bg-warm-ivory/40 rounded-xl border border-ink-black/5">
                    <span className="text-[10px] font-mono text-ink-black/50 uppercase tracking-widest block">
                      Most Worn Garments
                    </span>
                    <p className="font-serif text-2xl font-light text-ink-black mt-1">
                      {rotationData.most_worn.length} Pieces
                    </p>
                  </div>
                  <div className="p-4 bg-warm-ivory/40 rounded-xl border border-ink-black/5">
                    <span className="text-[10px] font-mono text-ink-black/50 uppercase tracking-widest block">
                      Under-Utilized / Unworn
                    </span>
                    <p className="font-serif text-2xl font-light text-amber-700 mt-1">
                      {rotationData.least_worn.filter((x) => x.total_wears === 0).length} Pieces
                    </p>
                  </div>
                </div>

                {/* Most Worn vs Under-Utilized Lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                  {/* Most Worn */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-ink-black/80 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>High Circulation Pieces</span>
                      </h4>
                      <span className="text-[10px] font-mono text-ink-black/50">Top Worn</span>
                    </div>

                    <div className="space-y-2.5">
                      {rotationData.most_worn.map((item) => (
                        <div
                          key={item.wardrobe_item_id}
                          className="flex items-center justify-between p-3 bg-white border border-ink-black/10 rounded-lg hover:border-ink-black/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded bg-warm-ivory/60 overflow-hidden border border-ink-black/5 flex-shrink-0">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  sizes="40px"
                                  className="object-contain p-0.5"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-ink-black/20">
                                  <Shirt className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-ink-black">{item.name}</p>
                              <p className="text-[10px] font-mono text-ink-black/50 uppercase">
                                {item.color} · {item.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-medium rounded-full">
                              {item.total_wears} Wears
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Under-Utilized / Unworn */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-ink-black/80 flex items-center gap-2">
                        <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                        <span>Candidates For Rotation</span>
                      </h4>
                      <span className="text-[10px] font-mono text-ink-black/50">Least Worn</span>
                    </div>

                    <div className="space-y-2.5">
                      {rotationData.least_worn.map((item) => (
                        <div
                          key={item.wardrobe_item_id}
                          className="flex items-center justify-between p-3 bg-white border border-ink-black/10 rounded-lg hover:border-ink-black/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded bg-warm-ivory/60 overflow-hidden border border-ink-black/5 flex-shrink-0">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  sizes="40px"
                                  className="object-contain p-0.5"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-ink-black/20">
                                  <Shirt className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-ink-black">{item.name}</p>
                              <p className="text-[10px] font-mono text-ink-black/50 uppercase">
                                {item.color} · {item.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded-full ${
                                item.total_wears === 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-ink-black/5 text-ink-black/60"
                              }`}
                            >
                              {item.total_wears === 0 ? "Unworn" : `${item.total_wears} Wears`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direct Action Hub */}
                <div className="pt-6 border-t border-ink-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-ink-black/70 font-light">
                    Want to see your full visual calendar or schedule looks for upcoming meetings?
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <Link
                      href="/wardrobe/history"
                      className="px-5 py-2.5 bg-ink-black hover:bg-electric-blue text-warm-ivory rounded-full transition-colors flex items-center gap-2"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Open Wear Diary & Calendar →</span>
                    </Link>
                    <Link
                      href="/wardrobe/planner"
                      className="px-5 py-2.5 bg-white hover:bg-ink-black/5 text-ink-black border border-ink-black/15 rounded-full transition-colors flex items-center gap-2"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Open Outfit Planner →</span>
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* 4. PERSONAL STYLE PROFILE & INSIGHTS */}
            {/* ============================================================ */}
            {styleProfile && (
              <section className="bg-white border border-ink-black/10 rounded-2xl p-6 lg:p-10 shadow-sm space-y-8">
                <div className="pb-6 border-b border-ink-black/10">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                    Behavioral Synthesis
                  </span>
                  <h2 className="font-serif text-2xl lg:text-3xl font-light text-ink-black mt-1">
                    Personal Style Profile & Vault DNA
                  </h2>
                  <p className="text-xs text-ink-black/70 mt-1 max-w-xl font-light">
                    An evolving reflection of your palette distribution, preferred silhouettes, and recorded styling habits.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Palette & Category Distribution */}
                  <div className="lg:col-span-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-ink-black/70 mb-3 flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-electric-blue" />
                        <span>Color Distribution</span>
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(styleProfile.color_distribution).map(([color, count]) => {
                          const pct = Math.round((count / (styleProfile.total_wardrobe_items || 1)) * 100);
                          return (
                            <div key={color} className="space-y-1">
                              <div className="flex justify-between text-xs font-mono">
                                <span>{color}</span>
                                <span className="text-ink-black/50">{pct}% ({count})</span>
                              </div>
                              <div className="w-full h-1.5 bg-ink-black/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-ink-black transition-all duration-500 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-ink-black/5">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-ink-black/70 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-electric-blue" />
                        <span>Category Breakdown</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(styleProfile.category_distribution).map(([cat, count]) => (
                          <span
                            key={cat}
                            className="px-3 py-1.5 bg-warm-ivory text-ink-black text-xs font-mono rounded-lg border border-ink-black/5 flex items-center gap-2"
                          >
                            <span className="font-medium">{cat}</span>
                            <span className="text-ink-black/40">· {count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Editorial Insights */}
                  <div className="lg:col-span-6 space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-ink-black/70 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
                      <span>Stylist Observations</span>
                    </h4>

                    <div className="space-y-3">
                      {styleProfile.insights.map((ins, iIdx) => (
                        <div
                          key={iIdx}
                          className="p-4 bg-warm-ivory/40 border border-ink-black/10 rounded-xl"
                        >
                          <span className="text-[10px] font-mono uppercase tracking-widest text-electric-blue block mb-1">
                            {ins.title}
                          </span>
                          <p className="text-xs text-ink-black/80 leading-relaxed font-light">
                            {ins.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* 5. COMPLETE YOUR WARDROBE (GAP ANALYSIS) */}
            {/* ============================================================ */}
            {gapSuggestions.length > 0 && (
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-electric-blue font-semibold">
                      Wardrobe Gap Analysis
                    </span>
                    <h2 className="font-serif text-2xl lg:text-3xl font-light text-ink-black mt-1">
                      Discover Your Next Piece
                    </h2>
                    <p className="text-xs text-ink-black/70 mt-1 max-w-xl font-light">
                      Identified gaps in your current wardrobe:{" "}
                      <span className="font-medium text-ink-black">
                        {missingCategories.length > 0 ? missingCategories.join(", ") : "Outerwear & Layers"}
                      </span>
                      . Genuine DRAPE catalog pieces that pair seamlessly with your collection.
                    </p>
                  </div>

                  <Link
                    href="/collections"
                    className="text-xs font-mono uppercase tracking-widest text-electric-blue hover:underline flex items-center gap-1"
                  >
                    <span>Browse Full Catalog</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {gapSuggestions.map((prod) => (
                    <div
                      key={prod.id}
                      className="group bg-white border border-ink-black/10 rounded-xl p-4 flex flex-col justify-between hover:shadow-lg transition-all"
                    >
                      <div>
                        <div className="relative aspect-[3/4] w-full rounded-lg bg-warm-ivory/50 overflow-hidden mb-3 border border-ink-black/5">
                          {prod.image_url ? (
                            <Image
                              src={prod.image_url}
                              alt={prod.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 25vw"
                              className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-ink-black/20">
                              <Shirt className="w-8 h-8" />
                            </div>
                          )}
                          {prod.compatible_try_on && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-electric-blue text-white text-[9px] font-mono uppercase tracking-wider rounded">
                              3D Try-On
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-black/50">
                          {prod.category} · {prod.color}
                        </span>
                        <h4 className="text-sm font-medium text-ink-black mt-1 line-clamp-1">
                          {prod.name}
                        </h4>
                        <p className="text-xs font-mono text-ink-black/70 mt-1">
                          ${prod.price.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-ink-black/60 mt-2 font-light line-clamp-2">
                          {prod.reason}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-ink-black/10 flex items-center justify-between text-xs font-mono">
                        <Link
                          href={`/collections/${prod.category}/${prod.product_slug}`}
                          className="hover:text-electric-blue transition-colors flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        {prod.compatible_try_on && (
                          <Link
                            href={`/try-on?garment=${prod.category === "dresses" ? "dress-midi" : "tshirt-crewneck"}&returnUrl=/wardrobe/studio`}
                            className="text-electric-blue hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Try On</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
