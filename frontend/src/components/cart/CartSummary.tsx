"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, Lock, ArrowRight } from "lucide-react";

interface CartSummaryProps {
  subtotal: number;
  totalItems: number;
}

export default function CartSummary({ subtotal, totalItems }: CartSummaryProps) {
  const isComplimentaryShipping = subtotal >= 500;
  const shippingFee = isComplimentaryShipping ? 0 : 25;
  const estimatedTax = subtotal * 0.0825;
  const grandTotal = subtotal + shippingFee + estimatedTax;

  return (
    <div className="bg-white/60 backdrop-blur-sm border border-ink-black/15 p-6 sm:p-8 space-y-6">
      <div className="border-b border-ink-black/10 pb-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/50 block mb-1">
          SUMMARY • DOSSIER
        </span>
        <h2 className="font-serif text-2xl text-ink-black font-light">
          Order Valuation
        </h2>
      </div>

      {/* Financial Breakdown */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex justify-between text-ink-black/80">
          <span>Subtotal ({totalItems} {totalItems === 1 ? "piece" : "pieces"}):</span>
          <span className="font-medium text-ink-black">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-ink-black/80">
          <span className="flex items-center space-x-1.5">
            <span>Global Express Courier:</span>
          </span>
          <span className={isComplimentaryShipping ? "text-emerald-700 font-medium" : "text-ink-black"}>
            {isComplimentaryShipping ? "Complimentary" : `$${shippingFee.toFixed(2)}`}
          </span>
        </div>

        {!isComplimentaryShipping && (
          <p className="text-[10px] text-ink-black/50 font-sans">
            Add ${(500 - subtotal).toFixed(2)} more to qualify for complimentary courier delivery.
          </p>
        )}

        <div className="flex justify-between text-ink-black/80">
          <span>Estimated Tax (8.25%):</span>
          <span className="text-ink-black">${estimatedTax.toFixed(2)}</span>
        </div>

        <div className="pt-4 border-t border-ink-black/10 flex justify-between items-baseline text-base sm:text-lg font-semibold text-ink-black">
          <span>Estimated Total:</span>
          <span>${grandTotal.toFixed(2)} USD</span>
        </div>
      </div>

      {/* Checkout Action Button */}
      <div className="space-y-3 pt-2">
        <Link
          href="/checkout"
          className="w-full py-4 px-6 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-electric-blue transition-colors shadow-sm"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Proceed To Checkout</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>

        <p className="text-[10px] font-mono text-center text-ink-black/50 uppercase tracking-wider">
          Demonstration Mode • No Real Charges Executed
        </p>
      </div>

      {/* Trust & Guarantee */}
      <div className="pt-4 border-t border-ink-black/10 space-y-2 text-[10px] font-mono text-ink-black/60">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-ink-black/70 shrink-0" />
          <span>Complimentary global returns within 14 days of receipt.</span>
        </div>
        <div className="flex items-center space-x-2">
          <Truck className="w-3.5 h-3.5 text-ink-black/70 shrink-0" />
          <span>Carbon-neutral insured shipping in custom archival garment boxes.</span>
        </div>
      </div>
    </div>
  );
}

