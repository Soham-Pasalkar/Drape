/**
 * DRAPE Smart Wardrobe 3D Try-On Matching Helper.
 * Evaluates whether an owned wardrobe garment maps to an existing 3D physical pattern.
 */

import { WardrobeItem } from "@/lib/api";
import { isRegisteredGarmentId } from "@/features/catalog/utils/product-mapping";

export interface WardrobeTryOnStatus {
  isCompatible: boolean;
  garmentId: string | null;
  badgeText: string;
  tryOnUrl: string | null;
}

export function getWardrobeItemTryOnStatus(item: WardrobeItem): WardrobeTryOnStatus {
  const name = (item.name || "").toLowerCase();
  const category = (item.category || "").toLowerCase();

  let matchedId: string | null = null;

  if (category === "dresses" || name.includes("dress") || name.includes("midi dress")) {
    matchedId = "dress-midi";
  } else if (category === "skirts" || name.includes("skirt")) {
    if (name.includes("pleat")) {
      matchedId = "skirt-pleated";
    } else {
      matchedId = "skirt-aline";
    }
  } else if (category === "t-shirts" || category === "tops" || name.includes("tee") || name.includes("t-shirt") || name.includes("top")) {
    if (name.includes("oversized") || name.includes("boxy")) {
      matchedId = "tshirt-oversized";
    } else if (name.includes("long-sleeve") || name.includes("long sleeve")) {
      matchedId = "top-longsleeve";
    } else if (name.includes("fitted") || name.includes("slim")) {
      matchedId = "tshirt-fitted";
    } else if (name.includes("crop") || name.includes("sleeveless") || name.includes("tank")) {
      matchedId = "top-sleeveless";
    } else {
      matchedId = "tshirt-crewneck";
    }
  }

  if (matchedId && isRegisteredGarmentId(matchedId)) {
    return {
      isCompatible: true,
      garmentId: matchedId,
      badgeText: "3D Try-On Ready",
      tryOnUrl: `/try-on?garment=${matchedId}&from=/wardrobe`,
    };
  }

  return {
    isCompatible: false,
    garmentId: null,
    badgeText: "Standard Garment",
    tryOnUrl: null,
  };
}
