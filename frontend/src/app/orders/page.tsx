"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { Order, getOrders } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function OrdersPage() {
  const { user, accessToken, loading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !accessToken) {
      setIsLoading(false);
      return;
    }

    getOrders(accessToken)
      .then((data) => {
        setOrders(data);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setError("Unable to retrieve your order history.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isAuthenticated, accessToken, isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Retrieving Client Orders Dossier...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-warm-ivory min-h-screen py-24 text-ink-black">
        <div className="max-w-md mx-auto px-6 text-center border border-dashed border-ink-black/20 p-10 bg-white/60">
          <Package className="w-12 h-12 stroke-[1] text-ink-black/40 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-light mb-2">Authentication Required</h1>
          <p className="font-sans text-xs text-ink-black/70 mb-6 leading-relaxed">
            Please sign in to view your archival orders and acquisition history.
          </p>
          <Link
            href="/login?redirect=/orders"
            className="inline-block w-full py-3.5 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
          >
            Sign In to Atelier Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        {/* Header */}
        <div className="border-b border-ink-black/10 pb-8 mb-10">
          <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
            CLIENT ARCHIVE • ACQUISITIONS
          </span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-ink-black">
              Order Dossier
            </h1>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-black/70">
              {orders.length} {orders.length === 1 ? "Acquisition" : "Acquisitions"} Recorded
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-ink-black/20 p-8 max-w-xl mx-auto">
            <ShoppingBag className="w-12 h-12 stroke-[1] text-ink-black/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-light text-ink-black mb-2">
              No Recorded Acquisitions
            </h2>
            <p className="font-sans text-xs text-ink-black/60 mb-6 leading-relaxed">
              You haven&apos;t placed any orders yet. Explore our current autumn/winter editorial collection.
            </p>
            <Link
              href="/collections"
              className="inline-block px-8 py-3.5 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 transition-colors hover:border-ink-black/30"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-ink-black/10 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-ink-black/60 text-[10px] uppercase block">
                      Order Number
                    </span>
                    <span className="font-semibold text-ink-black text-sm">
                      {ord.order_number}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-ink-black/60 text-[10px] uppercase block">
                      Date Placed
                    </span>
                    <span className="text-ink-black">
                      {new Date(ord.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-ink-black/60 text-[10px] uppercase block">
                      Total Settled
                    </span>
                    <span className="font-semibold text-ink-black">
                      ${Number(ord.total_amount).toFixed(2)} {ord.currency}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${
                        ord.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : ord.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-wrap gap-4">
                    {ord.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 text-xs">
                        <div className="w-14 h-16 bg-warm-ivory relative border border-ink-black/10 overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.product_name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-ink-black/40">
                              DRAPE
                            </div>
                          )}
                        </div>
                        <div className="max-w-[200px]">
                          <p className="font-medium text-ink-black truncate">{item.product_name}</p>
                          <p className="font-mono text-[10px] text-ink-black/60">
                            Size: {item.size} • Qty: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={`/orders/${ord.id}`}
                    className="inline-flex items-center space-x-2 px-5 py-3 border border-ink-black/20 text-xs font-mono uppercase tracking-widest text-ink-black hover:border-ink-black hover:bg-ink-black hover:text-warm-ivory transition-colors self-start md:self-center"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
