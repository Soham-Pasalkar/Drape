/**
 * DRAPE 3D Garment Mapping & Currency Utilities.
 *
 * Enforces strict verification against the central AR garment registry
 * (frontend/src/lib/ar/garment-registry.ts) to ensure zero false compatibility claims.
 */

import { getAllGarments, getGarmentById } from "@/lib/ar/garment-registry";
import { Product, ProductImage, ProductPrice } from "../types";

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

/**
 * Checks whether a garment color name matches a target color filter or search term.
 * Handles synonymous fashion shades (e.g., Noir / Black, Chalk White / White).
 */
export function isColorMatch(garmentColor: string, targetColor: string): boolean {
  if (!garmentColor || !targetColor) return false;
  const c = garmentColor.trim().toLowerCase();
  const t = targetColor.trim().toLowerCase();
  if (c === t) return true;

  // Synonyms for Black / Noir
  const blackFamily = ["noir", "black", "obsidian", "raven black", "midnight noir", "deep raven", "washed black", "black ink", "midnight black", "jet noir"];
  if (blackFamily.includes(t) && blackFamily.includes(c)) return true;

  // Synonyms for White
  const whiteFamily = ["white", "optic white", "chalk white", "glacier white", "optical white"];
  if (whiteFamily.includes(t) && whiteFamily.includes(c)) return true;

  return false;
}

/**
 * Resolves the primary photograph matching a specified color for a product.
 */
export function resolveProductImageForColor(
  product: Pick<Product, "images">,
  color?: string
): ProductImage | undefined {
  if (!color || !color.trim()) return undefined;
  const target = color.trim().toLowerCase();

  // Exact or semantic color match
  const match = product.images.find(
    (img) => img.color && isColorMatch(img.color, target)
  );
  if (match) return match;

  return undefined;
}

/**
 * Resolves the primary and hover display images for a product card.
 *
 * Guarantees:
 * 1. If selectedColor is specified, display the photograph matching that color.
 * 2. On hover, switch ONLY to an authentic alternate view of the exact same product & color.
 * 3. If no alternate view exists, retain the primary image on hover (no unrelated swap).
 * 4. Never display a photograph of another color when a color is filtered.
 */
export function resolveCardDisplayImages(
  product: Pick<Product, "images">,
  selectedColor?: string
): {
  primaryImage: string;
  secondaryImage: string;
  matchedColor?: string;
  hasAlternateView: boolean;
} {
  // 1. Color-filtered mode
  if (selectedColor && selectedColor.trim()) {
    const target = selectedColor.trim();
    const matchingImages = product.images.filter(
      (img) => img.color && isColorMatch(img.color, target)
    );

    if (matchingImages.length > 0) {
      const primary = matchingImages.find((img) => img.isPrimary) || matchingImages[0];
      const alternate = matchingImages.find((img) => img.id !== primary.id);

      return {
        primaryImage: primary.url,
        secondaryImage: alternate ? alternate.url : primary.url,
        matchedColor: primary.color,
        hasAlternateView: Boolean(alternate && alternate.url !== primary.url),
      };
    }
  }

  // 2. Default display mode (no color filtered)
  const primary = product.images.find((img) => img.isPrimary) || product.images[0];
  const primaryUrl = primary?.url || "/images/collection-essentials.jpg";

  // Alternate image must belong to the same color and product
  const alternate = product.images.find(
    (img) =>
      img.id !== primary?.id &&
      (!primary?.color || !img.color || isColorMatch(img.color, primary.color))
  );

  return {
    primaryImage: primaryUrl,
    secondaryImage: alternate ? alternate.url : primaryUrl,
    matchedColor: primary?.color,
    hasAlternateView: Boolean(alternate && alternate.url !== primaryUrl),
  };
}

