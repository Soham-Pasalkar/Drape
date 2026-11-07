"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Dynamically import client-only WebGL2 & MediaPipe try-on experience
const VirtualTryOnExperience = dynamic(
  () => import("@/components/try-on/VirtualTryOnExperience"),
  {
    ssr: false,
    loading: () => (
      <div className="bg-ink-black min-h-screen text-warm-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-2 border-warm-ivory/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <h2 className="font-serif text-2xl font-light tracking-wide mb-2">
          Calibrating Spatial Atelier...
        </h2>
        <p className="font-mono text-xs uppercase tracking-widest text-warm-ivory/60">
          Loading On-Device Neural Vision Engine
        </p>
      </div>
    ),
  }
);

function TryOnContent() {
  const searchParams = useSearchParams();
  const initialGarmentId = searchParams.get("garment") || undefined;
  const returnUrl = searchParams.get("from") || searchParams.get("returnTo") || undefined;

  return (
    <VirtualTryOnExperience
      initialGarmentId={initialGarmentId}
      returnUrl={returnUrl}
    />
  );
}

export default function TryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-ink-black min-h-screen text-warm-ivory flex flex-col items-center justify-center p-6 text-center">
          <div className="w-10 h-10 border-2 border-warm-ivory/20 border-t-electric-blue rounded-full animate-spin mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-warm-ivory/60">
            Initializing DRAPE Spatial Atelier...
          </p>
        </div>
      }
    >
      <TryOnContent />
    </Suspense>
  );
}

