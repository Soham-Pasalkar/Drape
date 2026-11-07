"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Check, Loader2, ArrowRight, AlertCircle } from "lucide-react";

interface AddToBagButtonProps {
  onAdd: () => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  disabled?: boolean;
  error?: string | null;
  sku?: string;
}

export default function AddToBagButton({
  onAdd,
  isLoading,
  isSuccess,
  disabled,
  error,
  sku,
}: AddToBagButtonProps) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled || isLoading}
        className={`w-full py-4 px-6 text-xs font-mono uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all shadow-sm ${
          disabled
            ? "bg-ink-black/20 text-ink-black/40 border border-ink-black/10 cursor-not-allowed"
            : isSuccess
            ? "bg-emerald-800 text-white border border-emerald-900"
            : "bg-ink-black text-warm-ivory border border-ink-black hover:bg-electric-blue hover:border-electric-blue active:scale-[0.99]"
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Adding To Atelier Bag...</span>
          </>
        ) : isSuccess ? (
          <>
            <Check className="w-4 h-4 text-acid-lime" />
            <span>Piece Reserved In Bag</span>
          </>
        ) : (
          <>
            <ShoppingBag className="w-4 h-4" />
            <span>Add To Atelier Bag</span>
          </>
        )}
      </button>

      {/* SKU Reference */}
      {sku && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-black/40 text-center">
          Selected SKU: <span className="text-ink-black/70">{sku}</span>
        </div>
      )}

      {/* Success Notification Bar */}
      {isSuccess && (
        <div className="p-3 bg-warm-ivory border border-ink-black/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-ink-black">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Garment added to your bag</span>
          </div>
          <Link
            href="/cart"
            className="text-electric-blue font-semibold uppercase tracking-wider flex items-center space-x-1 hover:underline"
          >
            <span>View Bag</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

