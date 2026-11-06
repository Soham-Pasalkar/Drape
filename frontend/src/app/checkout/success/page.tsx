"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Order, getOrderById } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const { accessToken } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("No order identifier provided.");
      setIsLoading(false);
      return;
    }

    getOrderById(orderId, accessToken)
      .then((data) => {
        setOrder(data);
      })
      .catch((err) => {
        console.error("Failed to fetch verified order:", err);
        setError("Unable to retrieve verified order details. Please check your orders page.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderId, accessToken]);

  if (isLoading) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Confirming Verified Atelier Order...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-warm-ivory min-h-screen py-24 text-ink-black">
        <div className="max-w-xl mx-auto px-6 text-center border border-ink-black/10 p-12 bg-white/70">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-light mb-2">Order Retrieval Issue</h1>
          <p className="font-mono text-xs text-ink-black/70 mb-8">{error || "Order not found"}</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/orders"
              className="px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
            >
              Go to My Orders
            </Link>
            <Link
              href="/collections"
              className="px-6 py-3 border border-ink-black/20 text-ink-black text-xs font-mono uppercase tracking-widest hover:border-ink-black transition-colors"
            >
              Browse Archive
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const addr = order.shipping_address_snapshot;

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-8">
        {/* Editorial Success Banner */}
        <div className="text-center pb-10 border-b border-ink-black/10 mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 mb-4">
            <CheckCircle2 className="w-8 h-8 stroke-[1.5]" />
          </div>
          <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
            ACQUISITION VERIFIED • ATELIER DOSSIER
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-ink-black mb-3">
            Thank You For Your Acquisition
          </h1>
          <p className="font-mono text-xs text-ink-black/70">
            Order Reference: <span className="font-semibold text-ink-black">{order.order_number}</span>
          </p>
        </div>

        {/* Order Details & Summary Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          {/* Left Column: Garments & Snapshots */}
          <div className="md:col-span-7 space-y-8">
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8">
              <h2 className="font-serif text-xl font-light text-ink-black mb-6 pb-3 border-b border-ink-black/10">
                Garment Manifest ({order.items.length})
              </h2>

              <div className="divide-y divide-ink-black/10">
                {order.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 text-xs">
                    <div className="w-16 h-20 bg-warm-ivory relative border border-ink-black/10 flex-shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-ink-black/40">
                          DRAPE
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink-black truncate">{item.product_name}</p>
                      <p className="font-mono text-[10px] text-ink-black/60 uppercase">
                        SKU: {item.sku}
                      </p>
                      <p className="font-mono text-[10px] text-ink-black/60 uppercase">
                        Size: {item.size} • Color: {item.color}
                      </p>
                      <p className="font-mono text-[10px] text-ink-black/50 mt-1">
                        Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}
                      </p>
                    </div>
                    <div className="font-mono text-xs font-semibold text-ink-black text-right">
                      ${Number(item.line_total).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Logistics & Tracking Info */}
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-4">
              <h3 className="font-serif text-lg font-light text-ink-black">
                Atelier Fulfillment Status
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-warm-ivory/50 border border-ink-black/10">
                  <span className="text-ink-black/60 text-[10px] uppercase block mb-1">
                    Order Status
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-emerald-800">
                    {order.status}
                  </span>
                </div>
                <div className="p-3 bg-warm-ivory/50 border border-ink-black/10">
                  <span className="text-ink-black/60 text-[10px] uppercase block mb-1">
                    Payment Gateway
                  </span>
                  <span className="font-semibold uppercase tracking-wider text-emerald-800">
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Address & Financial Ledger */}
          <div className="md:col-span-5 space-y-8">
            {/* Delivery Destination Snapshot */}
            <div className="bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-3">
              <h3 className="font-serif text-lg font-light text-ink-black pb-2 border-b border-ink-black/10">
                Delivery Destination
              </h3>
              <div className="text-xs font-mono text-ink-black/80 space-y-1">
                <p className="font-semibold text-ink-black">{addr?.full_name}</p>
                <p>{addr?.line1}{addr?.line2 ? `, ${addr.line2}` : ""}</p>
                <p>{addr?.city}, {addr?.state} {addr?.postal_code}</p>
                <p>{addr?.country}</p>
                <p className="text-ink-black/60 pt-2">Contact: {addr?.phone}</p>
                <p className="text-ink-black/60">Shipping: {order.shipping_method.toUpperCase()}</p>
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
                <span>Estimated Tax</span>
                <span>${Number(order.tax_amount).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-ink-black font-semibold text-sm pt-2 border-t border-ink-black/10">
                <span>Total Settled</span>
                <span>${Number(order.total_amount).toFixed(2)} USD</span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="space-y-3">
              <Link
                href="/orders"
                className="w-full py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2"
              >
                <span>View Order History</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/collections"
                className="w-full py-4 border border-ink-black/20 text-ink-black text-xs font-mono uppercase tracking-widest hover:border-ink-black transition-colors flex items-center justify-center"
              >
                Continue Exploring Archive
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
          <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
            Loading Confirmation...
          </p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}

