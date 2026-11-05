"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchBackendHealth, fetchBackendReadiness, HealthResponse } from "@/lib/api";
import { Activity, ShieldCheck, ChevronUp, ChevronDown } from "lucide-react";

export default function Footer() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  useEffect(() => {
    fetchBackendHealth()
      .then((data) => setHealth(data))
      .catch(() => setHealth(null));

    fetchBackendReadiness()
      .then((data) => setDbConnected(data.checks.database === "connected"))
      .catch(() => setDbConnected(false));
  }, []);

  return (
    <footer className="bg-ink-black text-warm-ivory border-t border-warm-ivory/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-16">
          {/* Brand Column (4 cols) */}
          <div className="md:col-span-4 space-y-5">
            <span className="text-3xl font-serif font-bold tracking-editorial text-warm-ivory block">
              DRAPE
            </span>
            <p className="text-xs text-warm-ivory/65 max-w-sm font-light leading-relaxed">
              DRAPE is an international luxury fashion house pioneering real-time digital
              garment drape, intelligent wardrobe curation, and neural styling.
            </p>
            <div className="text-[10px] uppercase tracking-widest text-warm-ivory/40 font-mono pt-2">
              PARIS • MILAN • NEW YORK • TOKYO
            </div>
          </div>

          {/* Navigation Links Column (3 cols) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[11px] uppercase tracking-editorial font-semibold text-warm-ivory">
              The Atelier
            </h4>
            <ul className="space-y-2.5 text-xs text-warm-ivory/70 font-light">
              <li>
                <Link href="#collections" className="hover:text-electric-blue transition-colors">
                  Autumn / Winter 2026
                </Link>
              </li>
              <li>
                <Link href="#try-on" className="hover:text-electric-blue transition-colors">
                  Try-On Studio Preview
                </Link>
              </li>
              <li>
                <Link href="#wardrobe" className="hover:text-electric-blue transition-colors">
                  The Digital Wardrobe
                </Link>
              </li>
              <li>
                <Link href="#stylist" className="hover:text-electric-blue transition-colors">
                  AI Personal Stylist
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies (2 cols) */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-[11px] uppercase tracking-editorial font-semibold text-warm-ivory">
              Customer Care
            </h4>
            <ul className="space-y-2.5 text-xs text-warm-ivory/70 font-light">
              <li className="hover:text-warm-ivory cursor-pointer transition-colors">
                Complimentary Shipping
              </li>
              <li className="hover:text-warm-ivory cursor-pointer transition-colors">
                Returns & Exchanges
              </li>
              <li className="hover:text-warm-ivory cursor-pointer transition-colors">
                Fabric Care Guide
              </li>
              <li className="hover:text-warm-ivory cursor-pointer transition-colors">
                Privacy Architecture
              </li>
            </ul>
          </div>

          {/* Truthfulness & Privacy Notice (3 cols) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[11px] uppercase tracking-editorial font-semibold text-warm-ivory flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-acid-lime" />
              <span>Visual Truthfulness</span>
            </h4>
            <p className="text-[11px] text-warm-ivory/60 font-light leading-relaxed">
              All digital try-on outputs represent bounded visual simulations and do not
              constitute tailored sizing or physical fit guarantees. Live camera processing
              executes strictly in local volatile browser memory with zero video transmission.
            </p>
          </div>
        </div>

        {/* Bottom Bar with Discreet System Status Utility */}
        <div className="mt-16 pt-8 border-t border-warm-ivory/10 flex flex-col sm:flex-row items-center justify-between text-xs text-warm-ivory/40 gap-4">
          <p className="font-light text-[11px]">
            &copy; {new Date().getFullYear()} DRAPE. All rights reserved.
          </p>

          {/* Discreet Luxury Platform Status Pill */}
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-warm-ivory/15 bg-warm-ivory/5 hover:bg-warm-ivory/10 text-warm-ivory/70 hover:text-warm-ivory transition-all"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  health?.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span>
                CORE API: {health?.status === "healthy" ? "ONLINE" : "STANDBY"}
              </span>
              {showDiagnostics ? (
                <ChevronDown className="w-3 h-3 text-warm-ivory/50" />
              ) : (
                <ChevronUp className="w-3 h-3 text-warm-ivory/50" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Technical Health Details (Cleanly Hidden from Normal Customer View) */}
        {showDiagnostics && (
          <div className="mt-4 p-4 bg-warm-ivory/5 border border-warm-ivory/10 rounded-none text-[10px] font-mono text-warm-ivory/70 flex flex-wrap justify-between gap-3 animate-fadeIn">
            <span>
              API Version: {health?.version || "0.1.0"} • Service: {health?.service || "drape-backend"}
            </span>
            <span>
              PostgreSQL: {dbConnected ? "Connected" : "Standby (Local Development)"}
            </span>
            <span>
              Target: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
