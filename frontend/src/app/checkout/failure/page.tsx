"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, RotateCcw, HelpCircle } from "lucide-react";

function CheckoutFailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const reason = searchParams.get("reason");

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-16 lg:py-24">
      <div className="max-w-xl mx-auto px-6 text-center">
        {/* Warning Icon Banner */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-700 mb-6">
          <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
        </div>

        <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
          TRANSACTION UNCOMPLETED • ATELIER DESK
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-ink-black mb-4">
          Payment Authorization Unsuccessful
        </h1>

        <p className="font-sans text-xs sm:text-sm text-ink-black/70 mb-8 leading-relaxed">
          {reason ||
            "The payment transaction could not be completed with the payment provider. Your atelier bag remains intact, and no financial charge has been captured."}
        </p>

        {orderId && (
          <div className="mb-8 p-3 bg-white/70 border border-ink-black/10 inline-block font-mono text-xs text-ink-black/80">
            Pending Order Reference: <span className="font-semibold">{orderId}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 max-w-sm mx-auto mb-10">
          <Link
            href="/checkout"
            className="w-full py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2"
          >
            <span>Return to Checkout & Retry</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/cart"
            className="w-full py-4 border border-ink-black/20 text-ink-black text-xs font-mono uppercase tracking-widest hover:border-ink-black transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to Atelier Bag</span>
          </Link>
        </div>

        {/* Concierge Help */}
        <div className="border-t border-ink-black/10 pt-6 text-[11px] font-mono text-ink-black/60 flex items-center justify-center space-x-2">
          <HelpCircle className="w-4 h-4" />
          <span>Need assistance? Contact concierge@drape.fashion</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
          <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
            Loading...
          </p>
        </div>
      }
    >
      <CheckoutFailureContent />
    </Suspense>
  );
}

