"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

export default function CartPage() {
  const { cart, isLoading, error, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const handleQuantityChange = async (itemId: string, newQty: number) => {
    try {
      setUpdatingItemId(itemId);
      await updateQuantity(itemId, newQty);
    } catch (err) {
      console.error("Failed to update item quantity:", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    try {
      setUpdatingItemId(itemId);
      await removeItem(itemId);
    } catch (err) {
      console.error("Failed to remove item:", err);
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (isLoading && !cart) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Retrieving Atelier Bag...
        </p>
      </div>
    );
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Editorial Cart Header */}
        <div className="border-b border-ink-black/10 pb-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
                CLIENT SPECIFICATION • ORDER DOSSIER
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black">
                Your Atelier Bag
              </h1>
            </div>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-black/70">
              {cart?.total_items || 0} {cart?.total_items === 1 ? "Piece" : "Pieces"} Curated
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2 rounded-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty Bag State */}
        {isEmpty && (
          <div className="py-24 text-center border border-dashed border-ink-black/20 max-w-2xl mx-auto p-8 rounded-sm">
            <ShoppingBag className="w-12 h-12 stroke-[1] text-ink-black/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-light text-ink-black mb-2">
              Your Atelier Bag is Presently Empty
            </h2>
            <p className="font-sans text-xs text-ink-black/60 max-w-sm mx-auto mb-8 leading-relaxed">
              Discover sculptural silhouettes and architectural garments from our autumn/winter ready-to-wear archive.
            </p>
            <Link
              href="/collections"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
            >
              <span>Explore The Archive</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Populated Bag Layout */}
        {!isEmpty && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
            {/* Left Column: Items List */}
            <div className="lg:col-span-8 space-y-6">
              <div className="divide-y divide-ink-black/10 border-t border-b border-ink-black/10">
                {items.map((item) => {
                  const isUpdating = updatingItemId === item.id;
                  const thumb = item.primary_image || "/images/collection-essentials.jpg";
                  return (
                    <div
                      key={item.id}
                      className={`py-6 flex flex-col sm:flex-row gap-5 transition-opacity ${
                        isUpdating ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <Link
                        href={`/products/${item.product_slug}`}
                        className="relative w-28 h-36 bg-ink-black/5 border border-ink-black/10 overflow-hidden flex-shrink-0 group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={item.product_name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>

                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <Link
                                href={`/products/${item.product_slug}`}
                                className="font-serif text-lg font-light text-ink-black hover:text-electric-blue transition-colors"
                              >
                                {item.product_name}
                              </Link>
                              <div className="flex items-center space-x-3 text-[10px] font-mono tracking-widest uppercase text-ink-black/60 mt-1">
                                <span>SIZE: {item.size}</span>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <span>COLOUR: {item.color}</span>
                                  {item.color_code && (
                                    <span
                                      className="inline-block w-2 h-2 rounded-full border border-ink-black/20"
                                      style={{ backgroundColor: item.color_code }}
                                    />
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Line Total */}
                            <div className="text-right font-mono">
                              <span className="text-sm font-medium text-ink-black">
                                ${item.line_total.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                              </span>
                              <div className="text-[10px] text-ink-black/50">
                                ${item.unit_price} each
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] font-mono text-ink-black/50 mt-1">
                            SKU: {item.sku}
                          </div>
                        </div>

                        {/* Controls: Quantity Stepper & Remove */}
                        <div className="flex items-center justify-between pt-4 mt-2">
                          {/* Quantity stepper */}
                          <div className="flex items-center border border-ink-black/20 bg-white">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating}
                              className="p-1.5 hover:bg-ink-black/5 disabled:opacity-30 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3 text-ink-black" />
                            </button>
                            <span className="font-mono text-xs w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.available_quantity || isUpdating}
                              className="p-1.5 hover:bg-ink-black/5 disabled:opacity-30 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3 text-ink-black" />
                            </button>
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={() => handleRemove(item.id)}
                            disabled={isUpdating}
                            className="text-xs font-mono text-ink-black/50 hover:text-red-700 flex items-center space-x-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] uppercase tracking-wider">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shopping continuation */}
              <div className="flex justify-between items-center pt-2">
                <Link
                  href="/collections"
                  className="text-xs font-mono uppercase tracking-widest text-ink-black hover:text-electric-blue flex items-center space-x-1"
                >
                  <span>← Continue Curating</span>
                </Link>
                {!user && (
                  <span className="text-[11px] font-mono text-ink-black/60">
                    Signing in merges this guest bag to your permanent customer dossier.
                  </span>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary Card */}
            <div className="lg:col-span-4">
              <div className="bg-white/60 backdrop-blur-sm border border-ink-black/10 p-6 sm:p-8 space-y-6 rounded-sm sticky top-28">
                <h3 className="font-mono text-xs tracking-widest uppercase text-ink-black border-b border-ink-black/10 pb-3 font-semibold">
                  Order Atelier Specification
                </h3>

                {/* Totals Breakdown */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-ink-black/80">
                    <span>Subtotal</span>
                    <span>
                      ${cart?.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} {cart?.currency}
                    </span>
                  </div>

                  <div className="flex justify-between text-ink-black/80">
                    <span>Atelier White-Glove Delivery</span>
                    <span className="text-emerald-700 uppercase font-medium">Complimentary</span>
                  </div>

                  <div className="flex justify-between text-ink-black/60 text-[11px]">
                    <span>Import Duties & Regional Tax</span>
                    <span>Calculated at Checkout</span>
                  </div>

                  <div className="border-t border-ink-black/10 pt-4 flex justify-between text-sm font-medium text-ink-black">
                    <span className="font-serif text-base">Estimated Total</span>
                    <span>
                      ${cart?.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} {cart?.currency}
                    </span>
                  </div>
                </div>

                {/* Primary Checkout Button */}
                <Link
                  href="/checkout"
                  className="w-full py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2"
                >
                  <span>Proceed to Atelier Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {/* Assurance details */}
                <div className="space-y-3 pt-4 border-t border-ink-black/10 text-[10px] font-mono text-ink-black/70">
                  <div className="flex items-center space-x-2.5">
                    <Truck className="w-4 h-4 text-ink-black/50 flex-shrink-0" />
                    <span>Complimentary Insured Global Express Delivery</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <RotateCcw className="w-4 h-4 text-ink-black/50 flex-shrink-0" />
                    <span>14-Day Complimentary Atelier Returns</span>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-ink-black/50 flex-shrink-0" />
                    <span>Authenticated Provenance & Archival Packaging</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Atelier Checkout Modal (M3 Disclosure) */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-warm-ivory border border-ink-black/20 max-w-lg w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-ink-black/60 hover:text-ink-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-electric-blue mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="font-mono text-xs tracking-widest uppercase font-medium">
                DRAPE COMMERCE • ATELIER DISCLOSURE
              </span>
            </div>

            <h3 className="font-serif text-2xl font-light text-ink-black mb-3">
              Atelier Checkout Pipeline
            </h3>

            <p className="font-sans text-xs sm:text-sm text-ink-black/75 leading-relaxed mb-6">
              Your bag items, selected sizes, and server-side pricing have been successfully validated
              and securely persisted to your DRAPE session.
              Payment gateway orchestration (Stripe / Apple Pay) will launch in Milestone 3 alongside
              the live 3D try-on simulation studio.
            </p>

            <div className="bg-white/80 border border-ink-black/10 p-4 rounded-sm space-y-2 mb-6 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-ink-black/60">BAG IDENTIFIER:</span>
                <span className="text-ink-black truncate max-w-[220px]">{cart?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-black/60">TOTAL VALUE:</span>
                <span className="font-medium text-ink-black">
                  ${cart?.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} {cart?.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-black/60">SESSION PERSISTENCE:</span>
                <span className="text-emerald-700 font-medium">Active (PostgreSQL Validated)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="flex-1 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
              >
                Back to Bag
              </button>
              <Link
                href="/collections"
                onClick={() => setCheckoutModalOpen(false)}
                className="py-3 px-6 border border-ink-black/30 text-center text-xs font-mono uppercase tracking-widest text-ink-black hover:border-ink-black transition-colors"
              >
                Continue Browsing
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

