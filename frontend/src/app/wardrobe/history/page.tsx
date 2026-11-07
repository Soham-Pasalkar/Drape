"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Shirt,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  WearLog,
  WardrobeItem,
  getWearLogs,
  deleteWearLog,
  createWearLog,
  getWardrobeItems,
} from "@/lib/api";

const OCCASIONS = ["casual", "office", "evening", "formal", "weekend"];

export default function WearHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDays, setFilterDays] = useState<number | null>(30); // 7, 30, 90, null
  const [activeDate, setActiveDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Calendar Month Navigation
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Modal: Log Worn Outfit
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [logOccasion, setLogOccasion] = useState<string>("casual");
  const [logNotes, setLogNotes] = useState<string>("");
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getWearLogs(filterDays ? { days: filterDays } : undefined);
      setWearLogs(res.wear_logs);
    } catch (err) {
      console.error("Failed to load wear history:", err);
    } finally {
      setLoading(false);
    }
  }, [user, filterDays]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/wardrobe/history");
    } else if (user) {
      fetchHistory();
    }
  }, [user, authLoading, router, fetchHistory]);

  const loadWardrobeForModal = async () => {
    try {
      const res = await getWardrobeItems({ limit: 100 });
      setWardrobeItems(res.items);
    } catch (err) {
      console.error("Failed to load wardrobe items for log modal:", err);
    }
  };

  const handleOpenLogModal = () => {
    loadWardrobeForModal();
    setSelectedItemIds([]);
    setLogDate(activeDate || new Date().toISOString().split("T")[0]);
    setLogOccasion("casual");
    setLogNotes("");
    setIsLogModalOpen(true);
  };

  const handleCreateWearLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) {
      alert("Please select at least one garment from your wardrobe.");
      return;
    }
    setSubmittingLog(true);
    try {
      await createWearLog({
        wear_date: logDate,
        occasion: logOccasion,
        notes: logNotes || undefined,
        wardrobe_item_ids: selectedItemIds,
      });
      setIsLogModalOpen(false);
      setToastMessage("Wear log successfully recorded.");
      setTimeout(() => setToastMessage(null), 3000);
      fetchHistory();
    } catch (err) {
      console.error("Failed to create wear log:", err);
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDeleteWearLog = async (id: string) => {
    if (!confirm("Are you sure you want to remove this wear record?")) return;
    try {
      await deleteWearLog(id);
      setWearLogs((prev) => prev.filter((l) => l.id !== id));
      setToastMessage("Wear record deleted.");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to delete wear log:", err);
    }
  };

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Leading padding from prev month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: prevDate.toISOString().split("T")[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Trailing padding
    const remaining = 35 - days.length;
    for (let d = 1; d <= (remaining > 0 ? remaining : 0); d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: nextDate.toISOString().split("T")[0],
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  // Map wear_date -> list of wear logs
  const logsByDate = useMemo(() => {
    const map: Record<string, WearLog[]> = {};
    for (const log of wearLogs) {
      if (!map[log.wear_date]) map[log.wear_date] = [];
      map[log.wear_date].push(log);
    }
    return map;
  }, [wearLogs]);

  const activeDateLogs = logsByDate[activeDate] || [];

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-ink-black selection:bg-electric-blue selection:text-white pb-32">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-ink-black text-warm-ivory px-6 py-3 rounded-full text-xs font-mono uppercase tracking-widest shadow-2xl flex items-center gap-2 border border-white/20 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <section className="border-b border-ink-black/10 bg-warm-ivory pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-ink-black/10">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50 mb-2">
                <Link href="/wardrobe/studio" className="hover:text-electric-blue">
                  DRAPE Studio
                </Link>
                <span>/</span>
                <span className="text-electric-blue font-semibold">Wear Diary</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black">
                Wear Diary & Calendar
              </h1>
              <p className="mt-2 text-sm text-ink-black/70 max-w-xl font-light leading-relaxed">
                A permanent photographic archive of garments and ensembles worn across dates, informing intelligent rotation health and personal style evolution.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenLogModal}
                className="px-5 py-2.5 bg-electric-blue hover:bg-[#1E3ECC] text-white text-xs font-mono uppercase tracking-widest rounded-full transition-all flex items-center gap-2 shadow-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Log Worn Outfit</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 pt-10 space-y-12">
        {/* Calendar and Day Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Monthly Calendar Widget */}
          <div className="lg:col-span-6 bg-white border border-ink-black/10 rounded-2xl p-6 lg:p-8 shadow-sm">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-6 border-b border-ink-black/10">
              <h2 className="font-serif text-xl font-light text-ink-black flex items-center gap-2.5">
                <CalendarIcon className="w-5 h-5 text-electric-blue" />
                <span>
                  {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </h2>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                  className="p-2 border border-ink-black/10 hover:border-ink-black/30 rounded-full transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-3 py-1 text-[11px] font-mono uppercase border border-ink-black/10 hover:border-ink-black/30 rounded-full transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                  className="p-2 border border-ink-black/10 hover:border-ink-black/30 rounded-full transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mt-4 text-center text-[11px] font-mono uppercase tracking-wider text-ink-black/50 pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cd, idx) => {
                const logs = logsByDate[cd.dateStr] || [];
                const hasLogs = logs.length > 0;
                const isSelected = activeDate === cd.dateStr;
                const isToday = cd.dateStr === new Date().toISOString().split("T")[0];

                return (
                  <button
                    key={idx}
                    onClick={() => setActiveDate(cd.dateStr)}
                    className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-center transition-all relative ${
                      isSelected
                        ? "bg-ink-black text-warm-ivory shadow-sm font-semibold"
                        : cd.isCurrentMonth
                        ? "hover:bg-warm-ivory/60 text-ink-black"
                        : "text-ink-black/25 hover:bg-warm-ivory/30"
                    } ${isToday && !isSelected ? "border border-electric-blue/40 font-semibold" : ""}`}
                  >
                    <span className="text-xs">{cd.dayNum}</span>
                    {hasLogs && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 ${
                          isSelected ? "bg-emerald-400" : "bg-electric-blue"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-ink-black/10 flex items-center justify-between text-[11px] font-mono text-ink-black/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-electric-blue" />
                <span>Logged Wear Day</span>
              </div>
              <div>Click any date to inspect</div>
            </div>
          </div>

          {/* Right: Selected Date Outfits */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-ink-black/10 rounded-2xl p-6 lg:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-ink-black/10">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                    Selected Calendar Date
                  </span>
                  <h3 className="font-serif text-xl font-light text-ink-black mt-0.5">
                    {new Date(activeDate + "T00:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h3>
                </div>
                <button
                  onClick={handleOpenLogModal}
                  className="px-3 py-1.5 bg-ink-black hover:bg-electric-blue text-warm-ivory text-[10px] font-mono uppercase tracking-widest rounded-full transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Log For This Day</span>
                </button>
              </div>

              {activeDateLogs.length > 0 ? (
                <div className="mt-6 space-y-6">
                  {activeDateLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-[#F7F5F0] border border-ink-black/10 rounded-xl p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-ink-black text-warm-ivory text-[10px] font-mono uppercase tracking-wider rounded-full">
                          {log.occasion || "Everyday"}
                        </span>
                        <button
                          onClick={() => handleDeleteWearLog(log.id)}
                          className="text-ink-black/40 hover:text-rose-600 transition-colors"
                          title="Delete wear record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {log.notes && (
                        <p className="text-xs text-ink-black/75 font-light italic">
                          &ldquo;{log.notes}&rdquo;
                        </p>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {log.items.map((it) => (
                          <div
                            key={it.id}
                            className="bg-white border border-ink-black/10 rounded-lg p-2.5 text-center"
                          >
                            <div className="relative aspect-[3/4] w-full rounded bg-warm-ivory/50 overflow-hidden mb-2">
                              {it.image_url_snapshot ? (
                                <Image
                                  src={it.image_url_snapshot}
                                  alt={it.garment_name_snapshot}
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
                            <p className="text-xs font-medium text-ink-black truncate">
                              {it.garment_name_snapshot}
                            </p>
                            <p className="text-[10px] font-mono text-ink-black/50 uppercase">
                              {it.color_snapshot} · {it.category_snapshot}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-ink-black/50 text-xs font-mono">
                  <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No outfit recorded for this date.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chronological History Feed */}
        <section className="space-y-6 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-ink-black/10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-ink-black/50">
                Archival Ledger
              </span>
              <h2 className="font-serif text-2xl font-light text-ink-black mt-1">
                All Logged Ensembles
              </h2>
            </div>

            {/* Filter by timeframe */}
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase">
              <span className="text-ink-black/50">Window:</span>
              {[
                { label: "7 Days", val: 7 },
                { label: "30 Days", val: 30 },
                { label: "90 Days", val: 90 },
                { label: "All Time", val: null },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilterDays(f.val)}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filterDays === f.val
                      ? "bg-ink-black text-warm-ivory font-semibold"
                      : "bg-white hover:bg-ink-black/5 text-ink-black/70 border border-ink-black/10"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-mono text-ink-black/50">
              Loading wear logs...
            </div>
          ) : wearLogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wearLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-ink-black/10 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 text-[10px] font-mono">
                      <span className="text-electric-blue font-semibold">
                        {new Date(log.wear_date + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="px-2 py-0.5 bg-warm-ivory border border-ink-black/10 uppercase rounded text-ink-black/70">
                        {log.occasion || "Everyday"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3 bg-warm-ivory/30 p-2 rounded-lg border border-ink-black/5">
                      {log.items.map((it) => (
                        <div key={it.id} className="text-center">
                          <div className="relative aspect-[3/4] w-full rounded bg-white overflow-hidden mb-1 border border-ink-black/5">
                            {it.image_url_snapshot ? (
                              <Image
                                src={it.image_url_snapshot}
                                alt={it.garment_name_snapshot}
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
                            {it.garment_name_snapshot}
                          </p>
                        </div>
                      ))}
                    </div>

                    {log.notes && (
                      <p className="text-xs text-ink-black/70 font-light italic line-clamp-2">
                        &ldquo;{log.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink-black/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-ink-black/40 text-[10px]">
                      {log.items.length} garments recorded
                    </span>
                    <button
                      onClick={() => handleDeleteWearLog(log.id)}
                      className="text-ink-black/40 hover:text-rose-600 transition-colors"
                      title="Remove record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-xl border border-ink-black/10 text-xs font-mono text-ink-black/50">
              No wear logs recorded for this timeframe.
            </div>
          )}
        </section>
      </main>

      {/* Manual Wear Log Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 lg:p-8 shadow-2xl border border-ink-black/15 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-ink-black/10">
              <h3 className="font-serif text-xl font-light text-ink-black">
                Log Worn Outfit
              </h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-ink-black/50 hover:text-ink-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWearLog} className="mt-6 space-y-5">
              {/* Date */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-1">
                  Wear Date
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full px-4 py-2 border border-ink-black/20 rounded-lg text-sm font-mono focus:border-electric-blue focus:outline-hidden"
                  required
                />
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest text-ink-black/70 mb-1">
                  Occasion
                </label>
                <select
                  value={logOccasion}
                  onChange={(e) => setLogOccasion(e.target.value)}
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
                  Select Garments Worn ({selectedItemIds.length} selected)
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
                  Personal Styling Notes (Optional)
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g., Casual atelier day with team review..."
                  className="w-full px-4 py-2 border border-ink-black/20 rounded-lg text-xs font-light focus:border-electric-blue focus:outline-hidden"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-ink-black/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-ink-black/70 hover:text-ink-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog || selectedItemIds.length === 0}
                  className="px-6 py-2.5 bg-electric-blue hover:bg-[#1E3ECC] text-white text-xs font-mono uppercase tracking-widest rounded-full transition-colors font-semibold disabled:opacity-50"
                >
                  {submittingLog ? "Recording..." : "Record In Wear Diary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

