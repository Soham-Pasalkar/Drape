"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Minus, Trash2 } from "lucide-react";
import { CartItem as CartItemType } from "@/lib/api";

interface CartItemProps {
  item: CartItemType;
  isUpdating: boolean;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onRemove: (itemId: string) => void;
}

export default function CartItem({
  item,
  isUpdating,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const thumb = item.primary_image || "/images/collection-essentials.jpg";

  return (
    <div className="py-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between border-b border-ink-black/10 last:border-b-0">
      <div className="flex items-center space-x-4">
        {/* Thumbnail Frame */}
        <Link
          href={`/products/${item.product_slug}`}
          className="relative w-20 sm:w-24 aspect-[3/4] overflow-hidden bg-ink-black/5 border border-ink-black/15 shrink-0 block"
        >
          <Image
            src={thumb}
            alt={item.product_name}
            fill
            sizes="96px"
            className="object-cover object-center"
          />
        </Link>

        {/* Product Details */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/50 block">
            {item.sku}
          </span>
          <Link
            href={`/products/${item.product_slug}`}
            className="font-serif text-base sm:text-lg text-ink-black hover:text-electric-blue transition-colors line-clamp-1"
          >
            {item.product_name}
          </Link>

          <div className="flex items-center space-x-3 text-xs font-mono text-ink-black/70 pt-0.5">
            <span className="flex items-center space-x-1.5">
              <span className="text-ink-black/40">COLOR:</span>
              <span className="font-medium text-ink-black">{item.color}</span>
              {item.color_code && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-ink-black/20 inline-block"
                  style={{ backgroundColor: item.color_code }}
                />
              )}
            </span>
            <span className="text-ink-black/20">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-ink-black/40">SIZE:</span>
              <span className="font-medium text-ink-black">{item.size}</span>
            </span>
          </div>

          <div className="font-mono text-xs text-ink-black/80 pt-1 sm:hidden">
            ${item.unit_price.toFixed(2)} each
          </div>
        </div>
      </div>

      {/* Quantity & Pricing Controls */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-8 pt-2 sm:pt-0">
        {/* Quantity Controls */}
        <div className="flex items-center border border-ink-black/20 bg-warm-ivory">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="p-2 text-ink-black/70 hover:text-ink-black hover:bg-ink-black/5 transition-colors disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-10 text-center font-mono text-xs font-medium text-ink-black">
            {item.quantity}
          </span>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="p-2 text-ink-black/70 hover:text-ink-black hover:bg-ink-black/5 transition-colors disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Line Price & Remove */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="font-mono text-sm sm:text-base font-semibold text-ink-black block">
              ${item.line_total.toFixed(2)}
            </span>
            <span className="font-mono text-[10px] text-ink-black/40 uppercase tracking-widest hidden sm:block">
              ${item.unit_price.toFixed(2)} ea
            </span>
          </div>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onRemove(item.id)}
            className="p-2 text-ink-black/40 hover:text-red-700 hover:bg-red-50 transition-colors rounded-sm"
            title="Remove item from bag"
            aria-label={`Remove ${item.product_name} from bag`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
