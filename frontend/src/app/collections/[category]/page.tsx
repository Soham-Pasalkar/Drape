import React, { Suspense } from "react";
import CollectionsView from "@/components/CollectionsView";

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export function generateMetadata({ params }: CategoryPageProps) {
  const title = params.category
    ? `${params.category.charAt(0).toUpperCase() + params.category.slice(1)} — DRAPE Collections`
    : "Collections — DRAPE";
  return {
    title,
    description: `Curated ${params.category} collection from DRAPE Atelier.`,
  };
}

export default function CategoryCollectionsPage({ params }: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-warm-ivory min-h-screen py-24 text-center">
          <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
          <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
            Filtering Archive...
          </p>
        </div>
      }
    >
      <CollectionsView initialCategory={params.category} />
    </Suspense>
  );
}

