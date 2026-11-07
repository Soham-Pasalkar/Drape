"use client";

import React, { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  Truck,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { Order, getOrderById } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { user, accessToken, loading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    getOrderById(id, accessToken)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        console.error("Failed to load order dossier:", err);
        setError("Unable to find the requested order dossier.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, accessToken, isAuthLoading]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Loading Order Dossier...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-warm-ivory min-h-screen py-24 text-ink-black">
        <div className="max-w-xl mx-auto px-6 text-center border border-ink-black/10 p-12 bg-white/70">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-light mb-2">Order Not Found</h1>
          <p className="font-mono text-xs text-ink-black/70 mb-8">{error || "Invalid order reference"}</p>
          <Link
            href="/orders"
            className="inline-block px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
          >
            Return to Order History
          </Link>
        </div>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot;

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/orders"
            className="inline-flex items-center space-x-2 font-mono text-xs uppercase tracking-wider text-ink-black/60 hover:text-ink-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Orders Dossier</span>
          </Link>
        </div>

        {/* Order Header */}
        <div className="border-b border-ink-black/10 pb-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
                ACQUISITION SPECIFICATION • DOSSIER
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-ink-black">
                {order.order_number}
              </h1>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span
                className={`px-3 py-1 uppercase tracking-wider ${
                  order.payment_status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : order.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                Status: {order.status}
              </span>
              <span className="text-ink-black/60">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Garment Manifest & Timeline */}
          <div className="lg:col-span-8 space-y-8">
            {/* Garment Manifest */}
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8">
              <h2 className="font-serif text-xl font-light text-ink-black mb-6 pb-3 border-b border-ink-black/10">
                Itemized Garment Manifest ({order.items.length})
              </h2>

              <div className="divide-y divide-ink-black/10">
                {order.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 text-xs">
                    <div className="w-20 h-24 bg-warm-ivory relative border border-ink-black/10 flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-ink-black/40">
                          DRAPE
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-ink-black truncate">
                        {item.product_name}
                      </p>
                      <div className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-black/60 uppercase">
                        <p>SKU: {item.sku}</p>
                        <p>Size: {item.size} • Color: {item.color}</p>
                        <p className="text-ink-black/50">
                          Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold text-ink-black text-right">
                      ${Number(item.line_total).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status History & Audit Log */}
            {order.status_history && order.status_history.length > 0 && (
              <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8">
                <h3 className="font-serif text-lg font-light text-ink-black mb-4 pb-2 border-b border-ink-black/10">
                  Lifecycle Audit Trail
                </h3>
                <div className="space-y-4">
                  {order.status_history.map((hist) => (
                    <div key={hist.id} className="flex items-start space-x-3 text-xs font-mono">
                      <Clock className="w-4 h-4 text-ink-black/40 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold uppercase tracking-wider text-ink-black">
                          {hist.to_status}
                          {hist.from_status && (
                            <span className="text-ink-black/50 font-normal"> (from {hist.from_status})</span>
                          )}
                        </p>
                        {hist.reason && (
                          <p className="text-ink-black/70 text-[11px] mt-0.5">{hist.reason}</p>
                        )}
                        <span className="text-[10px] text-ink-black/50">
                          {new Date(hist.created_at).toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Address & Ledger */}
          <div className="lg:col-span-4 space-y-8">
            {/* Delivery Snapshot */}
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-3">
              <h3 className="font-serif text-lg font-light text-ink-black pb-2 border-b border-ink-black/10">
                Delivery Address
              </h3>
              <div className="text-xs font-mono text-ink-black/80 space-y-1">
                <p className="font-semibold text-ink-black">{addr?.full_name}</p>
                <p>{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ""}</p>
                <p>{addr?.city}, {addr?.state} {addr?.postal_code}</p>
                <p>{addr?.country}</p>
                <p className="text-ink-black/60 pt-2">Phone: {addr?.phone}</p>
                <p className="text-ink-black/60">Tier: {order.shipping_method.toUpperCase()}</p>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-3 font-mono text-xs">
              <h3 className="font-serif text-lg font-light text-ink-black pb-2 border-b border-ink-black/10">
                Financial Breakdown
              </h3>
              <div className="flex justify-between text-ink-black/70">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-ink-black/70">
                <span>Shipping</span>
                <span>
                  {Number(order.shipping_amount) === 0
                    ? "Complimentary"
                    : `$${Number(order.shipping_amount).toFixed(2)} USD`}
                </span>
              </div>
              <div className="flex justify-between text-ink-black/70">
                <span>Tax</span>
                <span>${Number(order.tax_amount).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-ink-black font-semibold text-sm pt-2 border-t border-ink-black/10">
                <span>Total Settled</span>
                <span>${Number(order.total_amount).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Payment Transactions Record */}
            {order.payments && order.payments.length > 0 && (
              <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-3 font-mono text-xs">
                <h3 className="font-serif text-lg font-light text-ink-black pb-2 border-b border-ink-black/10">
                  Payment Transaction
                </h3>
                {order.payments.map((p) => (
                  <div key={p.id} className="space-y-1 text-ink-black/80">
                    <div className="flex justify-between font-semibold">
                      <span>Provider: {p.provider.toUpperCase()}</span>
                      <span className="uppercase text-emerald-800">{p.status}</span>
                    </div>
                    {p.provider_payment_id && (
                      <p className="text-[10px] text-ink-black/60 truncate">
                        Transaction ID: {p.provider_payment_id}
                      </p>
                    )}
                    <p className="text-[10px] text-ink-black/50">
                      Amount: ${Number(p.amount).toFixed(2)} {p.currency}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
