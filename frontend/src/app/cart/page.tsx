"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import CartItem from "@/components/cart/CartItem";
import CartSummary from "@/components/cart/CartSummary";
import EmptyCart from "@/components/cart/EmptyCart";

export default function CartPage() {
  const { cart, isLoading, error, updateQuantity, removeItem } = useCart();
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
    <div className="bg-warm-ivory min-h-screen text-ink-black py-10 sm:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Editorial Cart Header */}
        <div className="border-b border-ink-black/10 pb-8 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
                CLIENT SPECIFICATION • ORDER DOSSIER
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black">
                Your Atelier Bag
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/collections"
                className="inline-flex items-center space-x-1.5 text-xs font-mono uppercase tracking-widest text-ink-black/70 hover:text-ink-black"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Continue Shopping</span>
              </Link>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-black/70 border-l border-ink-black/20 pl-4">
                {cart?.total_items || 0} {cart?.total_items === 1 ? "Piece" : "Pieces"} Curated
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty Bag State */}
        {isEmpty ? (
          <EmptyCart />
        ) : (
          /* Populated Bag Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
            {/* Left Column: Items List */}
            <div className="lg:col-span-7 xl:col-span-8 divide-y divide-ink-black/10 border-t border-b border-ink-black/10">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  isUpdating={updatingItemId === item.id}
                  onUpdateQuantity={handleQuantityChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>

            {/* Right Column: Valuation Summary */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-8">
              <CartSummary
                subtotal={cart?.subtotal || 0}
                totalItems={cart?.total_items || 0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
