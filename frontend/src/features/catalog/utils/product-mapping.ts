/**
 * DRAPE 3D Garment Mapping & Currency Utilities.
 *
 * Enforces strict verification against the central AR garment registry
 * (frontend/src/lib/ar/garment-registry.ts) to ensure zero false compatibility claims.
 */

import { getAllGarments, getGarmentById } from "@/lib/ar/garment-registry";
import { Product, ProductPrice } from "../types";

/**
 * Validates that a given garmentId exists in the canonical AR registry.
 */
export function isRegisteredGarmentId(garmentId: string | null): boolean {
  if (!garmentId) return false;
  const all = getAllGarments();
  return all.some((g) => g.id === garmentId);
}

/**
 * Returns formatted USD currency from integer minor units (cents).
 * Never uses floating-point arithmetic for monetary calculations.
 */
export function formatCentsToUsd(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainingCents = Math.abs(cents % 100);
  if (remainingCents === 0) {
    return `$${dollars.toLocaleString("en-US")}`;
  }
  return `$${dollars.toLocaleString("en-US")}.${remainingCents.toString().padStart(2, "0")}`;
}

/**
 * Builds standard ProductPrice object from integer cents.
 */
export function createPrice(amountMinor: number): ProductPrice {
  return {
    amountMinor,
    amount: amountMinor / 100,
    currency: "USD",
    formatted: formatCentsToUsd(amountMinor),
  };
}

/**
 * Evaluates 3D Try-On compatibility for a product, ensuring no fake compatibility.
 */
export function getProductTryOnStatus(product: Pick<Product, "category" | "tryOn">): {
  isCompatible: boolean;
  garmentId: string | null;
  badgeText: string;
  explanation: string;
} {
  const { tryOn, category } = product;

  if (tryOn.available && tryOn.garmentId) {
    const registered = getGarmentById(tryOn.garmentId);
    if (registered) {
      return {
        isCompatible: true,
        garmentId: tryOn.garmentId,
        badgeText: "3D Try-On Ready",
        explanation: `Mapped to atelier 3D pattern "${registered.name}". Real-time on-device simulation supported.`,
      };
    }
  }

  // Not compatible with current 3D assets
  const categoryExplanations: Record<string, string> = {
    shirts: "3D try-on is currently in development for tailored button-front shirting.",
    trousers: "3D virtual try-on is currently in development for bifurcated trouser patterns.",
    outerwear: "3D virtual try-on is currently in development for structured heavy outerwear and coats.",
    dresses: "3D virtual try-on is currently in development for delicate strap and bias slip silhouettes.",
    skirts: "3D virtual try-on is currently available for selected A-line and pleated skirts.",
    tops: "3D virtual try-on is currently available for crewneck, boxy, fitted, and cashmere tops.",
  };

  const explanation =
    tryOn.explanation ||
    categoryExplanations[category] ||
    "3D virtual try-on is not currently available for this garment silhouette.";

  return {
    isCompatible: false,
    garmentId: null,
    badgeText: "3D Model In Atelier Development",
    explanation,
  };
}

/**
 * Constructs the Try-On Studio URL preserving garment ID and return-to-product context.
 */
export function buildTryOnUrl(product: Pick<Product, "slug" | "tryOn">): string | null {
  if (!product.tryOn.available || !product.tryOn.garmentId) {
    return null;
  }
  const params = new URLSearchParams();
  params.set("garment", product.tryOn.garmentId);
  params.set("from", `/products/${product.slug}`);
  return `/try-on?${params.toString()}`;
}
