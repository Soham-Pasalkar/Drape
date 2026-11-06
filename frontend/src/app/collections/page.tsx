import React, { Suspense } from "react";
import CollectionsView from "@/components/CollectionsView";

export const metadata = {
  title: "Collections — DRAPE Atelier Archive",
  description: "Browse the curated autumn/winter ready-to-wear archive of DRAPE.",
};

export default function CollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-warm-ivory min-h-screen py-24 text-center">
          <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
            Opening Archive...
          </p>
        </div>
      }
    >
      <CollectionsView />
    </Suspense>
  );
}

