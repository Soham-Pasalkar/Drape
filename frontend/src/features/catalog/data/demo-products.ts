/**
 * DRAPE Everyday Apparel Canonical Product Catalog.
 *
 * Exactly 18 contemporary everyday apparel styles across 5 clean categories:
 * - 5 T-Shirts (Classic Crew, Oversized Boxy, Relaxed Long-Sleeve, Slim-Fit, Cropped)
 * - 3 Jeans (Women's Straight, Men's Straight, Relaxed Denim)
 * - 1 Trousers (Basic Straight-Leg Cotton Chino)
 * - 4 Skirts (A-Line Mini, Straight Mini, Denim Mini, A-Line Midi)
 * - 5 Dresses (Sleeveless Mini, Short-Sleeve Mini, Slip Dress, Bodycon Mini, Everyday Cotton)
 *
 * Photography Integrity Guarantees:
 * 1. Every photograph genuinely depicts the exact product and colour variant.
 * 2. Every single color variant retains the EXACT same garment silhouette, folds, and cut.
 * 3. Every image binds explicitly to verified local files in frontend/public/images/products/.
 * 4. Products with single verified angles display that photograph on hover (no fake alternate views).
 * 5. Exactly 8 products with physically existing 3D models map to AR try-on (zero false compatibility).
 */

import { Product } from "../types";
import { createPrice } from "../utils/product-mapping";

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "prod-tshirt-001-classic-crew",
    slug: "classic-regular-fit-crew-neck-t-shirt",
    sku: "DRP-TSH-001",
    name: "Classic Regular-Fit Crew Neck T-Shirt",
    shortDescription: "Essential everyday crewneck cut from 200 GSM organic ring-spun cotton jersey.",
    description: "An enduring everyday essential crafted from 100% organic ring-spun cotton with a soft, durable hand feel. Features a classic ribbed collar, reinforced shoulder-to-shoulder taping, and a clean straight hem. Designed for daily comfort, layering, and lasting shape retention.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: createPrice(4800),
    material: "100% Organic Ring-Spun Cotton (200 GSM)",
    careInstructions: [
      "Machine wash warm (40°C) with like colours",
      "Tumble dry low or line dry in shade",
      "Medium iron if required",
      "Do not dry clean"
],
    tryOn: {
      available: true,
      garmentId: "tshirt-crewneck",
      explanation: "Full 3D physical simulation mapped to classic crewneck pattern geometry.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL","XXL"],
    availableColors: [
      {
            "name": "Noir Black",
            "code": "#111111"
      },
      {
            "name": "Optic White",
            "code": "#FFFFFF"
      },
      {
            "name": "Heather Grey",
            "code": "#8E8E93"
      },
      {
            "name": "Navy Blue",
            "code": "#1C2A39"
      },
      {
            "name": "Sand Beige",
            "code": "#D5C7B2"
      }
],
    images: [
      {
        id: "img-tshirt-001-classic-crew-noir-black-front",
        url: "/images/products/tshirts/classic-crew/black-front.webp",
        alt: "Classic Regular-Fit Crew Neck T-Shirt in Noir Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Noir Black",
        view: "front",
      },
      {
        id: "img-tshirt-001-classic-crew-optic-white-front",
        url: "/images/products/tshirts/classic-crew/white-front.webp",
        alt: "Classic Regular-Fit Crew Neck T-Shirt in Optic White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Optic White",
        view: "front",
      },
      {
        id: "img-tshirt-001-classic-crew-heather-grey-front",
        url: "/images/products/tshirts/classic-crew/grey-front.webp",
        alt: "Classic Regular-Fit Crew Neck T-Shirt in Heather Grey - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Heather Grey",
        view: "front",
      },
      {
        id: "img-tshirt-001-classic-crew-navy-blue-front",
        url: "/images/products/tshirts/classic-crew/navy-front.webp",
        alt: "Classic Regular-Fit Crew Neck T-Shirt in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-tshirt-001-classic-crew-sand-beige-front",
        url: "/images/products/tshirts/classic-crew/beige-front.webp",
        alt: "Classic Regular-Fit Crew Neck T-Shirt in Sand Beige - Front View",
        isPrimary: false,
        displayOrder: 4,
        color: "Sand Beige",
        view: "front",
      },
    ],
    variants: [
      { id: "var-tshirt-001-classic-crew-blk-xs", sku: "DRP-TSH-001-BLK-XS", size: "XS", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-blk-s", sku: "DRP-TSH-001-BLK-S", size: "S", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-blk-m", sku: "DRP-TSH-001-BLK-M", size: "M", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-blk-l", sku: "DRP-TSH-001-BLK-L", size: "L", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-blk-xl", sku: "DRP-TSH-001-BLK-XL", size: "XL", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-blk-xxl", sku: "DRP-TSH-001-BLK-XXL", size: "XXL", color: "Noir Black", colorCode: "#111111", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-xs", sku: "DRP-TSH-001-WHT-XS", size: "XS", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-s", sku: "DRP-TSH-001-WHT-S", size: "S", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-m", sku: "DRP-TSH-001-WHT-M", size: "M", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-l", sku: "DRP-TSH-001-WHT-L", size: "L", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-xl", sku: "DRP-TSH-001-WHT-XL", size: "XL", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-wht-xxl", sku: "DRP-TSH-001-WHT-XXL", size: "XXL", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-xs", sku: "DRP-TSH-001-HGY-XS", size: "XS", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-s", sku: "DRP-TSH-001-HGY-S", size: "S", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-m", sku: "DRP-TSH-001-HGY-M", size: "M", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-l", sku: "DRP-TSH-001-HGY-L", size: "L", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-xl", sku: "DRP-TSH-001-HGY-XL", size: "XL", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-hgy-xxl", sku: "DRP-TSH-001-HGY-XXL", size: "XXL", color: "Heather Grey", colorCode: "#8E8E93", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-xs", sku: "DRP-TSH-001-NVY-XS", size: "XS", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-s", sku: "DRP-TSH-001-NVY-S", size: "S", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-m", sku: "DRP-TSH-001-NVY-M", size: "M", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-l", sku: "DRP-TSH-001-NVY-L", size: "L", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-xl", sku: "DRP-TSH-001-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-nvy-xxl", sku: "DRP-TSH-001-NVY-XXL", size: "XXL", color: "Navy Blue", colorCode: "#1C2A39", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-xs", sku: "DRP-TSH-001-BGE-XS", size: "XS", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-s", sku: "DRP-TSH-001-BGE-S", size: "S", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-m", sku: "DRP-TSH-001-BGE-M", size: "M", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-l", sku: "DRP-TSH-001-BGE-L", size: "L", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 13, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-xl", sku: "DRP-TSH-001-BGE-XL", size: "XL", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 23, isActive: true },
      { id: "var-tshirt-001-classic-crew-bge-xxl", sku: "DRP-TSH-001-BGE-XXL", size: "XXL", color: "Sand Beige", colorCode: "#D5C7B2", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-tshirt-002-oversized-boxy",
    slug: "oversized-boxy-t-shirt",
    sku: "DRP-TSH-002",
    name: "Oversized Boxy T-Shirt",
    shortDescription: "Drop-shoulder relaxed silhouette knitted from 260 GSM dry-touch heavyweight cotton.",
    description: "A contemporary staple with relaxed drop shoulders, wide boxy body proportions, and elongated sleeves. Knitted from heavyweight 260 GSM cotton that holds its architectural shape without clinging.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: createPrice(5400),
    material: "100% Heavyweight Dry-Touch Cotton (260 GSM)",
    careInstructions: [
      "Machine wash cold inside out",
      "Do not bleach",
      "Tumble dry low",
      "Warm iron on reverse"
],
    tryOn: {
      available: true,
      garmentId: "tshirt-oversized",
      explanation: "3D virtual try-on mapped to relaxed boxy drop-shoulder pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL"],
    availableColors: [
      {
            "name": "Washed Black",
            "code": "#1E1E20"
      },
      {
            "name": "Off-White",
            "code": "#F5F3ED"
      },
      {
            "name": "Sage Green",
            "code": "#889C82"
      },
      {
            "name": "Navy Blue",
            "code": "#1B2738"
      },
      {
            "name": "Sand Beige",
            "code": "#D6C4AA"
      }
],
    images: [
      {
        id: "img-tshirt-002-oversized-boxy-washed-black-front",
        url: "/images/products/tshirts/boxy-tee/black-front.webp",
        alt: "Oversized Boxy T-Shirt in Washed Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Washed Black",
        view: "front",
      },
      {
        id: "img-tshirt-002-oversized-boxy-off-white-front",
        url: "/images/products/tshirts/boxy-tee/white-front.webp",
        alt: "Oversized Boxy T-Shirt in Off-White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Off-White",
        view: "front",
      },
      {
        id: "img-tshirt-002-oversized-boxy-sage-green-front",
        url: "/images/products/tshirts/boxy-tee/sage-front.webp",
        alt: "Oversized Boxy T-Shirt in Sage Green - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Sage Green",
        view: "front",
      },
      {
        id: "img-tshirt-002-oversized-boxy-navy-blue-front",
        url: "/images/products/tshirts/boxy-tee/navy-front.webp",
        alt: "Oversized Boxy T-Shirt in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-tshirt-002-oversized-boxy-sand-beige-front",
        url: "/images/products/tshirts/boxy-tee/beige-front.webp",
        alt: "Oversized Boxy T-Shirt in Sand Beige - Front View",
        isPrimary: false,
        displayOrder: 4,
        color: "Sand Beige",
        view: "front",
      },
    ],
    variants: [
      { id: "var-tshirt-002-oversized-boxy-wbk-xs", sku: "DRP-TSH-002-WBK-XS", size: "XS", color: "Washed Black", colorCode: "#1E1E20", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-wbk-s", sku: "DRP-TSH-002-WBK-S", size: "S", color: "Washed Black", colorCode: "#1E1E20", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-wbk-m", sku: "DRP-TSH-002-WBK-M", size: "M", color: "Washed Black", colorCode: "#1E1E20", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-wbk-l", sku: "DRP-TSH-002-WBK-L", size: "L", color: "Washed Black", colorCode: "#1E1E20", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-wbk-xl", sku: "DRP-TSH-002-WBK-XL", size: "XL", color: "Washed Black", colorCode: "#1E1E20", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-owh-xs", sku: "DRP-TSH-002-OWH-XS", size: "XS", color: "Off-White", colorCode: "#F5F3ED", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-owh-s", sku: "DRP-TSH-002-OWH-S", size: "S", color: "Off-White", colorCode: "#F5F3ED", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-owh-m", sku: "DRP-TSH-002-OWH-M", size: "M", color: "Off-White", colorCode: "#F5F3ED", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-owh-l", sku: "DRP-TSH-002-OWH-L", size: "L", color: "Off-White", colorCode: "#F5F3ED", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-owh-xl", sku: "DRP-TSH-002-OWH-XL", size: "XL", color: "Off-White", colorCode: "#F5F3ED", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-sge-xs", sku: "DRP-TSH-002-SGE-XS", size: "XS", color: "Sage Green", colorCode: "#889C82", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-sge-s", sku: "DRP-TSH-002-SGE-S", size: "S", color: "Sage Green", colorCode: "#889C82", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-sge-m", sku: "DRP-TSH-002-SGE-M", size: "M", color: "Sage Green", colorCode: "#889C82", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-sge-l", sku: "DRP-TSH-002-SGE-L", size: "L", color: "Sage Green", colorCode: "#889C82", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-sge-xl", sku: "DRP-TSH-002-SGE-XL", size: "XL", color: "Sage Green", colorCode: "#889C82", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-nvy-xs", sku: "DRP-TSH-002-NVY-XS", size: "XS", color: "Navy Blue", colorCode: "#1B2738", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-nvy-s", sku: "DRP-TSH-002-NVY-S", size: "S", color: "Navy Blue", colorCode: "#1B2738", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-nvy-m", sku: "DRP-TSH-002-NVY-M", size: "M", color: "Navy Blue", colorCode: "#1B2738", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-nvy-l", sku: "DRP-TSH-002-NVY-L", size: "L", color: "Navy Blue", colorCode: "#1B2738", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-nvy-xl", sku: "DRP-TSH-002-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#1B2738", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-bge-xs", sku: "DRP-TSH-002-BGE-XS", size: "XS", color: "Sand Beige", colorCode: "#D6C4AA", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-bge-s", sku: "DRP-TSH-002-BGE-S", size: "S", color: "Sand Beige", colorCode: "#D6C4AA", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-bge-m", sku: "DRP-TSH-002-BGE-M", size: "M", color: "Sand Beige", colorCode: "#D6C4AA", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-bge-l", sku: "DRP-TSH-002-BGE-L", size: "L", color: "Sand Beige", colorCode: "#D6C4AA", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-002-oversized-boxy-bge-xl", sku: "DRP-TSH-002-BGE-XL", size: "XL", color: "Sand Beige", colorCode: "#D6C4AA", inStock: true, quantity: 27, isActive: true },
    ],
  },
  {
    id: "prod-tshirt-003-relaxed-longsleeve",
    slug: "relaxed-fit-long-sleeve-t-shirt",
    sku: "DRP-TSH-003",
    name: "Relaxed-Fit Long-Sleeve T-Shirt",
    shortDescription: "Casual long-sleeve tee with ribbed cuffs in 210 GSM combed cotton.",
    description: "A comfortable transition piece designed with a relaxed body cut, full-length sleeves, and soft ribbed wrist cuffs. Crafted from breathable combed cotton jersey for effortless everyday layering.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: createPrice(5200),
    material: "100% Combed Cotton Jersey (210 GSM)",
    careInstructions: [
      "Machine wash cold",
      "Line dry recommended",
      "Cool iron if needed"
],
    tryOn: {
      available: true,
      garmentId: "top-longsleeve",
      explanation: "3D virtual try-on mapped to long-sleeve jersey silhouette.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["S","M","L","XL","XXL"],
    availableColors: [
      {
            "name": "Black",
            "code": "#121214"
      },
      {
            "name": "White",
            "code": "#FFFFFF"
      },
      {
            "name": "Charcoal Grey",
            "code": "#38393D"
      },
      {
            "name": "Navy Blue",
            "code": "#182333"
      },
      {
            "name": "Olive Green",
            "code": "#4E5B42"
      }
],
    images: [
      {
        id: "img-tshirt-003-relaxed-longsleeve-black-front",
        url: "/images/products/tshirts/relaxed-tee/black-front.webp",
        alt: "Relaxed-Fit Long-Sleeve T-Shirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-tshirt-003-relaxed-longsleeve-white-front",
        url: "/images/products/tshirts/relaxed-tee/white-front.webp",
        alt: "Relaxed-Fit Long-Sleeve T-Shirt in White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "White",
        view: "front",
      },
      {
        id: "img-tshirt-003-relaxed-longsleeve-charcoal-grey-front",
        url: "/images/products/tshirts/relaxed-tee/charcoal-front.webp",
        alt: "Relaxed-Fit Long-Sleeve T-Shirt in Charcoal Grey - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Charcoal Grey",
        view: "front",
      },
      {
        id: "img-tshirt-003-relaxed-longsleeve-navy-blue-front",
        url: "/images/products/tshirts/relaxed-tee/navy-front.webp",
        alt: "Relaxed-Fit Long-Sleeve T-Shirt in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-tshirt-003-relaxed-longsleeve-olive-green-front",
        url: "/images/products/tshirts/relaxed-tee/olive-front.webp",
        alt: "Relaxed-Fit Long-Sleeve T-Shirt in Olive Green - Front View",
        isPrimary: false,
        displayOrder: 4,
        color: "Olive Green",
        view: "front",
      },
    ],
    variants: [
      { id: "var-tshirt-003-relaxed-longsleeve-blk-s", sku: "DRP-TSH-003-BLK-S", size: "S", color: "Black", colorCode: "#121214", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-blk-m", sku: "DRP-TSH-003-BLK-M", size: "M", color: "Black", colorCode: "#121214", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-blk-l", sku: "DRP-TSH-003-BLK-L", size: "L", color: "Black", colorCode: "#121214", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-blk-xl", sku: "DRP-TSH-003-BLK-XL", size: "XL", color: "Black", colorCode: "#121214", inStock: true, quantity: 17, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-blk-xxl", sku: "DRP-TSH-003-BLK-XXL", size: "XXL", color: "Black", colorCode: "#121214", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-wht-s", sku: "DRP-TSH-003-WHT-S", size: "S", color: "White", colorCode: "#FFFFFF", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-wht-m", sku: "DRP-TSH-003-WHT-M", size: "M", color: "White", colorCode: "#FFFFFF", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-wht-l", sku: "DRP-TSH-003-WHT-L", size: "L", color: "White", colorCode: "#FFFFFF", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-wht-xl", sku: "DRP-TSH-003-WHT-XL", size: "XL", color: "White", colorCode: "#FFFFFF", inStock: true, quantity: 17, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-wht-xxl", sku: "DRP-TSH-003-WHT-XXL", size: "XXL", color: "White", colorCode: "#FFFFFF", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-chg-s", sku: "DRP-TSH-003-CHG-S", size: "S", color: "Charcoal Grey", colorCode: "#38393D", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-chg-m", sku: "DRP-TSH-003-CHG-M", size: "M", color: "Charcoal Grey", colorCode: "#38393D", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-chg-l", sku: "DRP-TSH-003-CHG-L", size: "L", color: "Charcoal Grey", colorCode: "#38393D", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-chg-xl", sku: "DRP-TSH-003-CHG-XL", size: "XL", color: "Charcoal Grey", colorCode: "#38393D", inStock: true, quantity: 17, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-chg-xxl", sku: "DRP-TSH-003-CHG-XXL", size: "XXL", color: "Charcoal Grey", colorCode: "#38393D", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-nvy-s", sku: "DRP-TSH-003-NVY-S", size: "S", color: "Navy Blue", colorCode: "#182333", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-nvy-m", sku: "DRP-TSH-003-NVY-M", size: "M", color: "Navy Blue", colorCode: "#182333", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-nvy-l", sku: "DRP-TSH-003-NVY-L", size: "L", color: "Navy Blue", colorCode: "#182333", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-nvy-xl", sku: "DRP-TSH-003-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#182333", inStock: true, quantity: 17, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-nvy-xxl", sku: "DRP-TSH-003-NVY-XXL", size: "XXL", color: "Navy Blue", colorCode: "#182333", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-olv-s", sku: "DRP-TSH-003-OLV-S", size: "S", color: "Olive Green", colorCode: "#4E5B42", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-olv-m", sku: "DRP-TSH-003-OLV-M", size: "M", color: "Olive Green", colorCode: "#4E5B42", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-olv-l", sku: "DRP-TSH-003-OLV-L", size: "L", color: "Olive Green", colorCode: "#4E5B42", inStock: true, quantity: 19, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-olv-xl", sku: "DRP-TSH-003-OLV-XL", size: "XL", color: "Olive Green", colorCode: "#4E5B42", inStock: true, quantity: 17, isActive: true },
      { id: "var-tshirt-003-relaxed-longsleeve-olv-xxl", sku: "DRP-TSH-003-OLV-XXL", size: "XXL", color: "Olive Green", colorCode: "#4E5B42", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-tshirt-004-slim-fit",
    slug: "slim-fit-basic-t-shirt",
    sku: "DRP-TSH-004",
    name: "Slim-Fit Basic T-Shirt",
    shortDescription: "Fitted crewneck tee with added stretch for clean everyday torso contouring.",
    description: "Tailored closer through the chest, waist, and sleeves for a neat, contoured silhouette. Blended with 5% elastane for flexible movement and shape recovery through daily wear.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: createPrice(4400),
    material: "95% Combed Cotton, 5% Elastane (190 GSM)",
    careInstructions: [
      "Machine wash warm delicate",
      "Do not tumble dry",
      "Cool iron on reverse"
],
    tryOn: {
      available: true,
      garmentId: "tshirt-fitted",
      explanation: "3D virtual try-on mapped to slim-contour torso pattern.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL"],
    availableColors: [
      {
            "name": "Black",
            "code": "#141416"
      },
      {
            "name": "White",
            "code": "#F8F7F4"
      },
      {
            "name": "Grey",
            "code": "#7C7E83"
      },
      {
            "name": "Navy Blue",
            "code": "#19233A"
      }
],
    images: [
      {
        id: "img-tshirt-004-slim-fit-black-front",
        url: "/images/products/tshirts/slim-tee/black-front.webp",
        alt: "Slim-Fit Basic T-Shirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-tshirt-004-slim-fit-white-front",
        url: "/images/products/tshirts/slim-tee/white-front.webp",
        alt: "Slim-Fit Basic T-Shirt in White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "White",
        view: "front",
      },
      {
        id: "img-tshirt-004-slim-fit-grey-front",
        url: "/images/products/tshirts/slim-tee/grey-front.webp",
        alt: "Slim-Fit Basic T-Shirt in Grey - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Grey",
        view: "front",
      },
      {
        id: "img-tshirt-004-slim-fit-navy-blue-front",
        url: "/images/products/tshirts/slim-tee/navy-front.webp",
        alt: "Slim-Fit Basic T-Shirt in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Navy Blue",
        view: "front",
      },
    ],
    variants: [
      { id: "var-tshirt-004-slim-fit-blk-xs", sku: "DRP-TSH-004-BLK-XS", size: "XS", color: "Black", colorCode: "#141416", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-blk-s", sku: "DRP-TSH-004-BLK-S", size: "S", color: "Black", colorCode: "#141416", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-blk-m", sku: "DRP-TSH-004-BLK-M", size: "M", color: "Black", colorCode: "#141416", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-blk-l", sku: "DRP-TSH-004-BLK-L", size: "L", color: "Black", colorCode: "#141416", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-blk-xl", sku: "DRP-TSH-004-BLK-XL", size: "XL", color: "Black", colorCode: "#141416", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-wht-xs", sku: "DRP-TSH-004-WHT-XS", size: "XS", color: "White", colorCode: "#F8F7F4", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-wht-s", sku: "DRP-TSH-004-WHT-S", size: "S", color: "White", colorCode: "#F8F7F4", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-wht-m", sku: "DRP-TSH-004-WHT-M", size: "M", color: "White", colorCode: "#F8F7F4", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-wht-l", sku: "DRP-TSH-004-WHT-L", size: "L", color: "White", colorCode: "#F8F7F4", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-wht-xl", sku: "DRP-TSH-004-WHT-XL", size: "XL", color: "White", colorCode: "#F8F7F4", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-gry-xs", sku: "DRP-TSH-004-GRY-XS", size: "XS", color: "Grey", colorCode: "#7C7E83", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-gry-s", sku: "DRP-TSH-004-GRY-S", size: "S", color: "Grey", colorCode: "#7C7E83", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-gry-m", sku: "DRP-TSH-004-GRY-M", size: "M", color: "Grey", colorCode: "#7C7E83", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-gry-l", sku: "DRP-TSH-004-GRY-L", size: "L", color: "Grey", colorCode: "#7C7E83", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-gry-xl", sku: "DRP-TSH-004-GRY-XL", size: "XL", color: "Grey", colorCode: "#7C7E83", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-nvy-xs", sku: "DRP-TSH-004-NVY-XS", size: "XS", color: "Navy Blue", colorCode: "#19233A", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-004-slim-fit-nvy-s", sku: "DRP-TSH-004-NVY-S", size: "S", color: "Navy Blue", colorCode: "#19233A", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-nvy-m", sku: "DRP-TSH-004-NVY-M", size: "M", color: "Navy Blue", colorCode: "#19233A", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-nvy-l", sku: "DRP-TSH-004-NVY-L", size: "L", color: "Navy Blue", colorCode: "#19233A", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-004-slim-fit-nvy-xl", sku: "DRP-TSH-004-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#19233A", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-tshirt-005-womens-cropped",
    slug: "womens-cropped-t-shirt",
    sku: "DRP-TSH-005",
    name: "Women's Cropped T-Shirt",
    shortDescription: "Sleek cropped silhouette hitting at the natural waistline in compact cotton rib.",
    description: "A modern wardrobe staple designed with a flattering cropped hemline that pairs naturally with high-rise denim and skirts. Finished with clean bound edges and soft breathable cotton.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: createPrice(4200),
    material: "100% Compact Cotton Rib (190 GSM)",
    careInstructions: [
      "Machine wash cold delicate",
      "Dry flat in shade",
      "Do not bleach"
],
    tryOn: {
      available: true,
      garmentId: "top-sleeveless",
      explanation: "3D virtual try-on mapped to cropped silhouette pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Black",
            "code": "#1A1A1C"
      },
      {
            "name": "White",
            "code": "#F6F4F0"
      },
      {
            "name": "Sand Beige",
            "code": "#D8CAB4"
      },
      {
            "name": "Dusty Rose",
            "code": "#BE8C91"
      }
],
    images: [
      {
        id: "img-tshirt-005-womens-cropped-black-front",
        url: "/images/products/tshirts/cropped-tee/black-front.webp",
        alt: "Women's Cropped T-Shirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-tshirt-005-womens-cropped-white-front",
        url: "/images/products/tshirts/cropped-tee/white-front.webp",
        alt: "Women's Cropped T-Shirt in White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "White",
        view: "front",
      },
      {
        id: "img-tshirt-005-womens-cropped-sand-beige-front",
        url: "/images/products/tshirts/cropped-tee/beige-front.webp",
        alt: "Women's Cropped T-Shirt in Sand Beige - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Sand Beige",
        view: "front",
      },
      {
        id: "img-tshirt-005-womens-cropped-dusty-rose-front",
        url: "/images/products/tshirts/cropped-tee/rose-front.webp",
        alt: "Women's Cropped T-Shirt in Dusty Rose - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Dusty Rose",
        view: "front",
      },
    ],
    variants: [
      { id: "var-tshirt-005-womens-cropped-blk-xs", sku: "DRP-TSH-005-BLK-XS", size: "XS", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-005-womens-cropped-blk-s", sku: "DRP-TSH-005-BLK-S", size: "S", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-blk-m", sku: "DRP-TSH-005-BLK-M", size: "M", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-blk-l", sku: "DRP-TSH-005-BLK-L", size: "L", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-wht-xs", sku: "DRP-TSH-005-WHT-XS", size: "XS", color: "White", colorCode: "#F6F4F0", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-005-womens-cropped-wht-s", sku: "DRP-TSH-005-WHT-S", size: "S", color: "White", colorCode: "#F6F4F0", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-wht-m", sku: "DRP-TSH-005-WHT-M", size: "M", color: "White", colorCode: "#F6F4F0", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-wht-l", sku: "DRP-TSH-005-WHT-L", size: "L", color: "White", colorCode: "#F6F4F0", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-bge-xs", sku: "DRP-TSH-005-BGE-XS", size: "XS", color: "Sand Beige", colorCode: "#D8CAB4", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-005-womens-cropped-bge-s", sku: "DRP-TSH-005-BGE-S", size: "S", color: "Sand Beige", colorCode: "#D8CAB4", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-bge-m", sku: "DRP-TSH-005-BGE-M", size: "M", color: "Sand Beige", colorCode: "#D8CAB4", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-bge-l", sku: "DRP-TSH-005-BGE-L", size: "L", color: "Sand Beige", colorCode: "#D8CAB4", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-ros-xs", sku: "DRP-TSH-005-ROS-XS", size: "XS", color: "Dusty Rose", colorCode: "#BE8C91", inStock: true, quantity: 27, isActive: true },
      { id: "var-tshirt-005-womens-cropped-ros-s", sku: "DRP-TSH-005-ROS-S", size: "S", color: "Dusty Rose", colorCode: "#BE8C91", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-ros-m", sku: "DRP-TSH-005-ROS-M", size: "M", color: "Dusty Rose", colorCode: "#BE8C91", inStock: true, quantity: 15, isActive: true },
      { id: "var-tshirt-005-womens-cropped-ros-l", sku: "DRP-TSH-005-ROS-L", size: "L", color: "Dusty Rose", colorCode: "#BE8C91", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-jeans-001-womens-straight",
    slug: "womens-straight-fit-jeans",
    sku: "DRP-JNS-001",
    name: "Women's Straight-Fit Jeans",
    shortDescription: "High-rise 5-pocket denim jeans with a timeless straight leg cut in 13 oz cotton.",
    description: "Classic high-waisted straight jeans made from 100% durable 13 oz cotton denim. Features traditional 5-pocket styling, sturdy copper rivets, zip fly, and an authentic washed finish that softens with wear.",
    category: "jeans",
    brand: "DRAPE Everyday",
    price: createPrice(11800),
    material: "100% Organic Cotton Denim (13 oz)",
    careInstructions: [
      "Wash inside out in cold water",
      "Do not bleach",
      "Hang to dry to preserve indigo color",
      "Warm iron if needed"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["24","25","26","27","28","29","30","31","32"],
    availableColors: [
      {
            "name": "Washed Blue",
            "code": "#8EABC2"
      },
      {
            "name": "Dark Blue",
            "code": "#1C2A3D"
      },
      {
            "name": "Washed Black",
            "code": "#222224"
      }
],
    images: [
      {
        id: "img-jeans-001-womens-straight-washed-blue-front",
        url: "/images/products/jeans/womens-straight/washed-blue-front.webp",
        alt: "Women's Straight-Fit Jeans in Washed Blue - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Washed Blue",
        view: "front",
      },
      {
        id: "img-jeans-001-womens-straight-dark-blue-front",
        url: "/images/products/jeans/womens-straight/dark-blue-front.webp",
        alt: "Women's Straight-Fit Jeans in Dark Blue - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Dark Blue",
        view: "front",
      },
      {
        id: "img-jeans-001-womens-straight-washed-black-front",
        url: "/images/products/jeans/womens-straight/black-front.webp",
        alt: "Women's Straight-Fit Jeans in Washed Black - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Washed Black",
        view: "front",
      },
    ],
    variants: [
      { id: "var-jeans-001-womens-straight-wbl-24", sku: "DRP-JNS-001-WBL-24", size: "24", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-25", sku: "DRP-JNS-001-WBL-25", size: "25", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-26", sku: "DRP-JNS-001-WBL-26", size: "26", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-27", sku: "DRP-JNS-001-WBL-27", size: "27", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-28", sku: "DRP-JNS-001-WBL-28", size: "28", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-29", sku: "DRP-JNS-001-WBL-29", size: "29", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-30", sku: "DRP-JNS-001-WBL-30", size: "30", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-31", sku: "DRP-JNS-001-WBL-31", size: "31", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbl-32", sku: "DRP-JNS-001-WBL-32", size: "32", color: "Washed Blue", colorCode: "#8EABC2", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-24", sku: "DRP-JNS-001-DKB-24", size: "24", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-25", sku: "DRP-JNS-001-DKB-25", size: "25", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-26", sku: "DRP-JNS-001-DKB-26", size: "26", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-27", sku: "DRP-JNS-001-DKB-27", size: "27", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-28", sku: "DRP-JNS-001-DKB-28", size: "28", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-29", sku: "DRP-JNS-001-DKB-29", size: "29", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-30", sku: "DRP-JNS-001-DKB-30", size: "30", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-31", sku: "DRP-JNS-001-DKB-31", size: "31", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-dkb-32", sku: "DRP-JNS-001-DKB-32", size: "32", color: "Dark Blue", colorCode: "#1C2A3D", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-24", sku: "DRP-JNS-001-WBK-24", size: "24", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-25", sku: "DRP-JNS-001-WBK-25", size: "25", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-26", sku: "DRP-JNS-001-WBK-26", size: "26", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-27", sku: "DRP-JNS-001-WBK-27", size: "27", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-28", sku: "DRP-JNS-001-WBK-28", size: "28", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-29", sku: "DRP-JNS-001-WBK-29", size: "29", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-30", sku: "DRP-JNS-001-WBK-30", size: "30", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-31", sku: "DRP-JNS-001-WBK-31", size: "31", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
      { id: "var-jeans-001-womens-straight-wbk-32", sku: "DRP-JNS-001-WBK-32", size: "32", color: "Washed Black", colorCode: "#222224", inStock: true, quantity: 27, isActive: true },
    ],
  },
  {
    id: "prod-jeans-002-mens-straight",
    slug: "mens-straight-fit-jeans",
    sku: "DRP-JNS-002",
    name: "Men's Straight-Fit Jeans",
    shortDescription: "Mid-rise regular straight-leg jeans in heavy-duty 13.5 oz ring-spun denim.",
    description: "A dependable daily pair built from 13.5 oz ring-spun cotton denim. Sits comfortably at the waist with room through the seat and thighs, falling into a classic straight hem.",
    category: "jeans",
    brand: "DRAPE Everyday",
    price: createPrice(12500),
    material: "100% Ring-Spun Cotton Denim (13.5 oz)",
    careInstructions: [
      "Machine wash cold inside out",
      "Hang dry",
      "Do not tumble dry"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["28","30","32","34","36"],
    availableColors: [
      {
            "name": "Vintage Blue",
            "code": "#5C7C9E"
      },
      {
            "name": "Raw Indigo",
            "code": "#152233"
      },
      {
            "name": "Charcoal Grey",
            "code": "#2E3033"
      }
],
    images: [
      {
        id: "img-jeans-002-mens-straight-vintage-blue-front",
        url: "/images/products/jeans/mens-straight/vintage-blue-front.webp",
        alt: "Men's Straight-Fit Jeans in Vintage Blue - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Vintage Blue",
        view: "front",
      },
      {
        id: "img-jeans-002-mens-straight-raw-indigo-front",
        url: "/images/products/jeans/mens-straight/indigo-front.webp",
        alt: "Men's Straight-Fit Jeans in Raw Indigo - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Raw Indigo",
        view: "front",
      },
      {
        id: "img-jeans-002-mens-straight-charcoal-grey-front",
        url: "/images/products/jeans/mens-straight/charcoal-front.webp",
        alt: "Men's Straight-Fit Jeans in Charcoal Grey - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Charcoal Grey",
        view: "front",
      },
    ],
    variants: [
      { id: "var-jeans-002-mens-straight-vbl-28", sku: "DRP-JNS-002-VBL-28", size: "28", color: "Vintage Blue", colorCode: "#5C7C9E", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-vbl-30", sku: "DRP-JNS-002-VBL-30", size: "30", color: "Vintage Blue", colorCode: "#5C7C9E", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-vbl-32", sku: "DRP-JNS-002-VBL-32", size: "32", color: "Vintage Blue", colorCode: "#5C7C9E", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-vbl-34", sku: "DRP-JNS-002-VBL-34", size: "34", color: "Vintage Blue", colorCode: "#5C7C9E", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-vbl-36", sku: "DRP-JNS-002-VBL-36", size: "36", color: "Vintage Blue", colorCode: "#5C7C9E", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-ind-28", sku: "DRP-JNS-002-IND-28", size: "28", color: "Raw Indigo", colorCode: "#152233", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-ind-30", sku: "DRP-JNS-002-IND-30", size: "30", color: "Raw Indigo", colorCode: "#152233", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-ind-32", sku: "DRP-JNS-002-IND-32", size: "32", color: "Raw Indigo", colorCode: "#152233", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-ind-34", sku: "DRP-JNS-002-IND-34", size: "34", color: "Raw Indigo", colorCode: "#152233", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-ind-36", sku: "DRP-JNS-002-IND-36", size: "36", color: "Raw Indigo", colorCode: "#152233", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-chg-28", sku: "DRP-JNS-002-CHG-28", size: "28", color: "Charcoal Grey", colorCode: "#2E3033", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-chg-30", sku: "DRP-JNS-002-CHG-30", size: "30", color: "Charcoal Grey", colorCode: "#2E3033", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-chg-32", sku: "DRP-JNS-002-CHG-32", size: "32", color: "Charcoal Grey", colorCode: "#2E3033", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-chg-34", sku: "DRP-JNS-002-CHG-34", size: "34", color: "Charcoal Grey", colorCode: "#2E3033", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-002-mens-straight-chg-36", sku: "DRP-JNS-002-CHG-36", size: "36", color: "Charcoal Grey", colorCode: "#2E3033", inStock: true, quantity: 23, isActive: true },
    ],
  },
  {
    id: "prod-jeans-003-relaxed-denim",
    slug: "relaxed-fit-denim-jeans",
    sku: "DRP-JNS-003",
    name: "Relaxed-Fit Denim Jeans",
    shortDescription: "Laid-back relaxed cut with loose thigh volume and clean straight hem.",
    description: "Designed for easy everyday comfort with an easy relaxed silhouette through the hips and thighs. Stone-washed for a soft broken-in feel from day one.",
    category: "jeans",
    brand: "DRAPE Everyday",
    price: createPrice(12000),
    material: "100% Cotton Denim (12.5 oz)",
    careInstructions: [
      "Machine wash cold",
      "Tumble dry low",
      "Do not dry clean"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["28","30","32","34","36"],
    availableColors: [
      {
            "name": "Light Blue",
            "code": "#92AEC4"
      },
      {
            "name": "Medium Blue",
            "code": "#4A6B8A"
      },
      {
            "name": "Washed Black",
            "code": "#1F2022"
      }
],
    images: [
      {
        id: "img-jeans-003-relaxed-denim-light-blue-front",
        url: "/images/products/jeans/relaxed-denim/light-blue-front.webp",
        alt: "Relaxed-Fit Denim Jeans in Light Blue - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Light Blue",
        view: "front",
      },
      {
        id: "img-jeans-003-relaxed-denim-medium-blue-front",
        url: "/images/products/jeans/relaxed-denim/medium-blue-front.webp",
        alt: "Relaxed-Fit Denim Jeans in Medium Blue - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Medium Blue",
        view: "front",
      },
      {
        id: "img-jeans-003-relaxed-denim-washed-black-front",
        url: "/images/products/jeans/relaxed-denim/black-front.webp",
        alt: "Relaxed-Fit Denim Jeans in Washed Black - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Washed Black",
        view: "front",
      },
    ],
    variants: [
      { id: "var-jeans-003-relaxed-denim-lbl-28", sku: "DRP-JNS-003-LBL-28", size: "28", color: "Light Blue", colorCode: "#92AEC4", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-lbl-30", sku: "DRP-JNS-003-LBL-30", size: "30", color: "Light Blue", colorCode: "#92AEC4", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-lbl-32", sku: "DRP-JNS-003-LBL-32", size: "32", color: "Light Blue", colorCode: "#92AEC4", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-lbl-34", sku: "DRP-JNS-003-LBL-34", size: "34", color: "Light Blue", colorCode: "#92AEC4", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-lbl-36", sku: "DRP-JNS-003-LBL-36", size: "36", color: "Light Blue", colorCode: "#92AEC4", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-mbl-28", sku: "DRP-JNS-003-MBL-28", size: "28", color: "Medium Blue", colorCode: "#4A6B8A", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-mbl-30", sku: "DRP-JNS-003-MBL-30", size: "30", color: "Medium Blue", colorCode: "#4A6B8A", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-mbl-32", sku: "DRP-JNS-003-MBL-32", size: "32", color: "Medium Blue", colorCode: "#4A6B8A", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-mbl-34", sku: "DRP-JNS-003-MBL-34", size: "34", color: "Medium Blue", colorCode: "#4A6B8A", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-mbl-36", sku: "DRP-JNS-003-MBL-36", size: "36", color: "Medium Blue", colorCode: "#4A6B8A", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-wbk-28", sku: "DRP-JNS-003-WBK-28", size: "28", color: "Washed Black", colorCode: "#1F2022", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-wbk-30", sku: "DRP-JNS-003-WBK-30", size: "30", color: "Washed Black", colorCode: "#1F2022", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-wbk-32", sku: "DRP-JNS-003-WBK-32", size: "32", color: "Washed Black", colorCode: "#1F2022", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-wbk-34", sku: "DRP-JNS-003-WBK-34", size: "34", color: "Washed Black", colorCode: "#1F2022", inStock: true, quantity: 23, isActive: true },
      { id: "var-jeans-003-relaxed-denim-wbk-36", sku: "DRP-JNS-003-WBK-36", size: "36", color: "Washed Black", colorCode: "#1F2022", inStock: true, quantity: 23, isActive: true },
    ],
  },
  {
    id: "prod-trouser-001-straight-cotton",
    slug: "basic-straight-leg-cotton-trousers",
    sku: "DRP-TRS-001",
    name: "Basic Straight-Leg Cotton Trousers",
    shortDescription: "Tailored everyday chino trousers in durable stretch cotton twill.",
    description: "Versatile straight-leg chinos tailored from combed cotton twill with subtle stretch. Finished with welt back pockets, slanted front pockets, and a clean interior waistband.",
    category: "trousers",
    brand: "DRAPE Everyday",
    price: createPrice(9800),
    material: "98% Cotton, 2% Elastane Twill (240 GSM)",
    careInstructions: [
      "Machine wash warm delicate",
      "Warm iron",
      "Tumble dry low"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for tailored trousers.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["28","30","32","34","36","38"],
    availableColors: [
      {
            "name": "Khaki Beige",
            "code": "#C4B599"
      },
      {
            "name": "Navy Blue",
            "code": "#1B273A"
      },
      {
            "name": "Black",
            "code": "#18181A"
      },
      {
            "name": "Olive Green",
            "code": "#454F3B"
      }
],
    images: [
      {
        id: "img-trouser-001-straight-cotton-khaki-beige-front",
        url: "/images/products/trousers/cotton-trousers/beige-front.webp",
        alt: "Basic Straight-Leg Cotton Trousers in Khaki Beige - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Khaki Beige",
        view: "front",
      },
      {
        id: "img-trouser-001-straight-cotton-navy-blue-front",
        url: "/images/products/trousers/cotton-trousers/navy-front.webp",
        alt: "Basic Straight-Leg Cotton Trousers in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-trouser-001-straight-cotton-black-front",
        url: "/images/products/trousers/cotton-trousers/black-front.webp",
        alt: "Basic Straight-Leg Cotton Trousers in Black - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Black",
        view: "front",
      },
      {
        id: "img-trouser-001-straight-cotton-olive-green-front",
        url: "/images/products/trousers/cotton-trousers/olive-front.webp",
        alt: "Basic Straight-Leg Cotton Trousers in Olive Green - Front View",
        isPrimary: false,
        displayOrder: 3,
        color: "Olive Green",
        view: "front",
      },
    ],
    variants: [
      { id: "var-trouser-001-straight-cotton-khk-28", sku: "DRP-TRS-001-KHK-28", size: "28", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-khk-30", sku: "DRP-TRS-001-KHK-30", size: "30", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-khk-32", sku: "DRP-TRS-001-KHK-32", size: "32", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-khk-34", sku: "DRP-TRS-001-KHK-34", size: "34", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-khk-36", sku: "DRP-TRS-001-KHK-36", size: "36", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-khk-38", sku: "DRP-TRS-001-KHK-38", size: "38", color: "Khaki Beige", colorCode: "#C4B599", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-28", sku: "DRP-TRS-001-NVY-28", size: "28", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-30", sku: "DRP-TRS-001-NVY-30", size: "30", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-32", sku: "DRP-TRS-001-NVY-32", size: "32", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-34", sku: "DRP-TRS-001-NVY-34", size: "34", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-36", sku: "DRP-TRS-001-NVY-36", size: "36", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-nvy-38", sku: "DRP-TRS-001-NVY-38", size: "38", color: "Navy Blue", colorCode: "#1B273A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-28", sku: "DRP-TRS-001-BLK-28", size: "28", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-30", sku: "DRP-TRS-001-BLK-30", size: "30", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-32", sku: "DRP-TRS-001-BLK-32", size: "32", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-34", sku: "DRP-TRS-001-BLK-34", size: "34", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-36", sku: "DRP-TRS-001-BLK-36", size: "36", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-blk-38", sku: "DRP-TRS-001-BLK-38", size: "38", color: "Black", colorCode: "#18181A", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-28", sku: "DRP-TRS-001-OLV-28", size: "28", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-30", sku: "DRP-TRS-001-OLV-30", size: "30", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-32", sku: "DRP-TRS-001-OLV-32", size: "32", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-34", sku: "DRP-TRS-001-OLV-34", size: "34", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-36", sku: "DRP-TRS-001-OLV-36", size: "36", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
      { id: "var-trouser-001-straight-cotton-olv-38", sku: "DRP-TRS-001-OLV-38", size: "38", color: "Olive Green", colorCode: "#454F3B", inStock: true, quantity: 13, isActive: true },
    ],
  },
  {
    id: "prod-skirt-001-aline-mini",
    slug: "basic-a-line-mini-skirt",
    sku: "DRP-SKT-001",
    name: "Basic A-Line Mini Skirt",
    shortDescription: "Flattering A-line mini skirt crafted in structured woven cotton blend.",
    description: "A minimalist wardrobe essential with a subtle flared A-line silhouette hitting at mid-thigh. Features a clean waistband, concealed side zip closure, and interior lining.",
    category: "skirts",
    brand: "DRAPE Everyday",
    price: createPrice(6800),
    material: "65% Cotton, 33% Polyester, 2% Spandex",
    careInstructions: [
      "Machine wash cold delicate",
      "Hang to dry",
      "Cool iron if required"
],
    tryOn: {
      available: true,
      garmentId: "skirt-aline",
      explanation: "3D virtual try-on available with real-time cloth simulation on A-line pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Black",
            "code": "#1A1A1C"
      },
      {
            "name": "Sand Beige",
            "code": "#DACCB6"
      },
      {
            "name": "Off-White",
            "code": "#F4F2EE"
      }
],
    images: [
      {
        id: "img-skirt-001-aline-mini-black-front",
        url: "/images/products/skirts/aline-mini/black-front.webp",
        alt: "Basic A-Line Mini Skirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-skirt-001-aline-mini-sand-beige-front",
        url: "/images/products/skirts/aline-mini/beige-front.webp",
        alt: "Basic A-Line Mini Skirt in Sand Beige - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Sand Beige",
        view: "front",
      },
      {
        id: "img-skirt-001-aline-mini-off-white-front",
        url: "/images/products/skirts/aline-mini/white-front.webp",
        alt: "Basic A-Line Mini Skirt in Off-White - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Off-White",
        view: "front",
      },
    ],
    variants: [
      { id: "var-skirt-001-aline-mini-blk-xs", sku: "DRP-SKT-001-BLK-XS", size: "XS", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-001-aline-mini-blk-s", sku: "DRP-SKT-001-BLK-S", size: "S", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-blk-m", sku: "DRP-SKT-001-BLK-M", size: "M", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-blk-l", sku: "DRP-SKT-001-BLK-L", size: "L", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-bge-xs", sku: "DRP-SKT-001-BGE-XS", size: "XS", color: "Sand Beige", colorCode: "#DACCB6", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-001-aline-mini-bge-s", sku: "DRP-SKT-001-BGE-S", size: "S", color: "Sand Beige", colorCode: "#DACCB6", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-bge-m", sku: "DRP-SKT-001-BGE-M", size: "M", color: "Sand Beige", colorCode: "#DACCB6", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-bge-l", sku: "DRP-SKT-001-BGE-L", size: "L", color: "Sand Beige", colorCode: "#DACCB6", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-owh-xs", sku: "DRP-SKT-001-OWH-XS", size: "XS", color: "Off-White", colorCode: "#F4F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-001-aline-mini-owh-s", sku: "DRP-SKT-001-OWH-S", size: "S", color: "Off-White", colorCode: "#F4F2EE", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-owh-m", sku: "DRP-SKT-001-OWH-M", size: "M", color: "Off-White", colorCode: "#F4F2EE", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-001-aline-mini-owh-l", sku: "DRP-SKT-001-OWH-L", size: "L", color: "Off-White", colorCode: "#F4F2EE", inStock: true, quantity: 28, isActive: true },
    ],
  },
  {
    id: "prod-skirt-002-straight-mini",
    slug: "straight-fit-mini-skirt",
    sku: "DRP-SKT-002",
    name: "Straight-Fit Mini Skirt",
    shortDescription: "Clean straight pencil mini skirt with subtle stretch for effortless movement.",
    description: "Sleek straight cut with a contoured waistband and back vent for ease of movement. Pairs seamlessly with relaxed tees and tailored shirts.",
    category: "skirts",
    brand: "DRAPE Everyday",
    price: createPrice(6400),
    material: "70% Rayon, 26% Nylon, 4% Spandex",
    careInstructions: [
      "Dry clean or cold hand wash",
      "Lay flat to dry",
      "Do not tumble dry"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for straight pencil skirt cuts.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Black",
            "code": "#171719"
      },
      {
            "name": "Cocoa Brown",
            "code": "#5A3E2F"
      },
      {
            "name": "Heather Grey",
            "code": "#7B7D82"
      }
],
    images: [
      {
        id: "img-skirt-002-straight-mini-black-front",
        url: "/images/products/skirts/straight-mini/black-front.webp",
        alt: "Straight-Fit Mini Skirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-skirt-002-straight-mini-cocoa-brown-front",
        url: "/images/products/skirts/straight-mini/brown-front.webp",
        alt: "Straight-Fit Mini Skirt in Cocoa Brown - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Cocoa Brown",
        view: "front",
      },
      {
        id: "img-skirt-002-straight-mini-heather-grey-front",
        url: "/images/products/skirts/straight-mini/grey-front.webp",
        alt: "Straight-Fit Mini Skirt in Heather Grey - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Heather Grey",
        view: "front",
      },
    ],
    variants: [
      { id: "var-skirt-002-straight-mini-blk-xs", sku: "DRP-SKT-002-BLK-XS", size: "XS", color: "Black", colorCode: "#171719", inStock: true, quantity: 23, isActive: true },
      { id: "var-skirt-002-straight-mini-blk-s", sku: "DRP-SKT-002-BLK-S", size: "S", color: "Black", colorCode: "#171719", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-blk-m", sku: "DRP-SKT-002-BLK-M", size: "M", color: "Black", colorCode: "#171719", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-blk-l", sku: "DRP-SKT-002-BLK-L", size: "L", color: "Black", colorCode: "#171719", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-brn-xs", sku: "DRP-SKT-002-BRN-XS", size: "XS", color: "Cocoa Brown", colorCode: "#5A3E2F", inStock: true, quantity: 23, isActive: true },
      { id: "var-skirt-002-straight-mini-brn-s", sku: "DRP-SKT-002-BRN-S", size: "S", color: "Cocoa Brown", colorCode: "#5A3E2F", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-brn-m", sku: "DRP-SKT-002-BRN-M", size: "M", color: "Cocoa Brown", colorCode: "#5A3E2F", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-brn-l", sku: "DRP-SKT-002-BRN-L", size: "L", color: "Cocoa Brown", colorCode: "#5A3E2F", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-hgy-xs", sku: "DRP-SKT-002-HGY-XS", size: "XS", color: "Heather Grey", colorCode: "#7B7D82", inStock: true, quantity: 23, isActive: true },
      { id: "var-skirt-002-straight-mini-hgy-s", sku: "DRP-SKT-002-HGY-S", size: "S", color: "Heather Grey", colorCode: "#7B7D82", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-hgy-m", sku: "DRP-SKT-002-HGY-M", size: "M", color: "Heather Grey", colorCode: "#7B7D82", inStock: true, quantity: 13, isActive: true },
      { id: "var-skirt-002-straight-mini-hgy-l", sku: "DRP-SKT-002-HGY-L", size: "L", color: "Heather Grey", colorCode: "#7B7D82", inStock: true, quantity: 13, isActive: true },
    ],
  },
  {
    id: "prod-skirt-003-denim-mini",
    slug: "simple-denim-mini-skirt",
    sku: "DRP-SKT-003",
    name: "Simple Denim Mini Skirt",
    shortDescription: "Classic 5-pocket denim mini skirt with copper shank button front.",
    description: "Crafted from durable 12 oz cotton denim with authentic contrast stitching, copper hardware, and a clean straight hemline.",
    category: "skirts",
    brand: "DRAPE Everyday",
    price: createPrice(7200),
    material: "100% Cotton Denim (12 oz)",
    careInstructions: [
      "Machine wash cold inside out",
      "Hang to dry",
      "Warm iron"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for denim skirt cuts.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["24","25","26","27","28","29","30"],
    availableColors: [
      {
            "name": "Denim Blue",
            "code": "#547599"
      },
      {
            "name": "Washed Black",
            "code": "#202124"
      },
      {
            "name": "Clean White",
            "code": "#F3F2EE"
      }
],
    images: [
      {
        id: "img-skirt-003-denim-mini-denim-blue-front",
        url: "/images/products/skirts/denim-mini/denim-blue-front.webp",
        alt: "Simple Denim Mini Skirt in Denim Blue - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Denim Blue",
        view: "front",
      },
      {
        id: "img-skirt-003-denim-mini-washed-black-front",
        url: "/images/products/skirts/denim-mini/washed-black-front.webp",
        alt: "Simple Denim Mini Skirt in Washed Black - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Washed Black",
        view: "front",
      },
      {
        id: "img-skirt-003-denim-mini-clean-white-front",
        url: "/images/products/skirts/denim-mini/white-front.webp",
        alt: "Simple Denim Mini Skirt in Clean White - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Clean White",
        view: "front",
      },
    ],
    variants: [
      { id: "var-skirt-003-denim-mini-dbl-24", sku: "DRP-SKT-003-DBL-24", size: "24", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-25", sku: "DRP-SKT-003-DBL-25", size: "25", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-26", sku: "DRP-SKT-003-DBL-26", size: "26", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-27", sku: "DRP-SKT-003-DBL-27", size: "27", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-28", sku: "DRP-SKT-003-DBL-28", size: "28", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-29", sku: "DRP-SKT-003-DBL-29", size: "29", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-dbl-30", sku: "DRP-SKT-003-DBL-30", size: "30", color: "Denim Blue", colorCode: "#547599", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-24", sku: "DRP-SKT-003-WBK-24", size: "24", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-25", sku: "DRP-SKT-003-WBK-25", size: "25", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-26", sku: "DRP-SKT-003-WBK-26", size: "26", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-27", sku: "DRP-SKT-003-WBK-27", size: "27", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-28", sku: "DRP-SKT-003-WBK-28", size: "28", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-29", sku: "DRP-SKT-003-WBK-29", size: "29", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-wbk-30", sku: "DRP-SKT-003-WBK-30", size: "30", color: "Washed Black", colorCode: "#202124", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-24", sku: "DRP-SKT-003-CWH-24", size: "24", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-25", sku: "DRP-SKT-003-CWH-25", size: "25", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-26", sku: "DRP-SKT-003-CWH-26", size: "26", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-27", sku: "DRP-SKT-003-CWH-27", size: "27", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-28", sku: "DRP-SKT-003-CWH-28", size: "28", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-29", sku: "DRP-SKT-003-CWH-29", size: "29", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-003-denim-mini-cwh-30", sku: "DRP-SKT-003-CWH-30", size: "30", color: "Clean White", colorCode: "#F3F2EE", inStock: true, quantity: 17, isActive: true },
    ],
  },
  {
    id: "prod-skirt-004-aline-midi",
    slug: "basic-a-line-midi-skirt",
    sku: "DRP-SKT-004",
    name: "Basic A-Line Midi Skirt",
    shortDescription: "Graceful calf-length flowing A-line midi skirt with elasticized back waist.",
    description: "An elegant everyday midi skirt that drapes fluidly down to mid-calf. Fitted smoothly at the front waist with discreet elastication at the back for all-day comfort.",
    category: "skirts",
    brand: "DRAPE Everyday",
    price: createPrice(8200),
    material: "100% Soft Tencel Lyocell",
    careInstructions: [
      "Machine wash cold on gentle cycle",
      "Hang to dry in shade",
      "Cool iron"
],
    tryOn: {
      available: true,
      garmentId: "skirt-pleated",
      explanation: "3D virtual try-on available with flowing cloth simulation on midi skirt pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL"],
    availableColors: [
      {
            "name": "Black",
            "code": "#1A1A1C"
      },
      {
            "name": "Olive Khaki",
            "code": "#444B38"
      },
      {
            "name": "Warm Cream",
            "code": "#F0EBDC"
      }
],
    images: [
      {
        id: "img-skirt-004-aline-midi-black-front",
        url: "/images/products/skirts/aline-midi/black-front.webp",
        alt: "Basic A-Line Midi Skirt in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-skirt-004-aline-midi-olive-khaki-front",
        url: "/images/products/skirts/aline-midi/olive-front.webp",
        alt: "Basic A-Line Midi Skirt in Olive Khaki - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Olive Khaki",
        view: "front",
      },
      {
        id: "img-skirt-004-aline-midi-warm-cream-front",
        url: "/images/products/skirts/aline-midi/cream-front.webp",
        alt: "Basic A-Line Midi Skirt in Warm Cream - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Warm Cream",
        view: "front",
      },
    ],
    variants: [
      { id: "var-skirt-004-aline-midi-blk-xs", sku: "DRP-SKT-004-BLK-XS", size: "XS", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-004-aline-midi-blk-s", sku: "DRP-SKT-004-BLK-S", size: "S", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-blk-m", sku: "DRP-SKT-004-BLK-M", size: "M", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-blk-l", sku: "DRP-SKT-004-BLK-L", size: "L", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-blk-xl", sku: "DRP-SKT-004-BLK-XL", size: "XL", color: "Black", colorCode: "#1A1A1C", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-004-aline-midi-olk-xs", sku: "DRP-SKT-004-OLK-XS", size: "XS", color: "Olive Khaki", colorCode: "#444B38", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-004-aline-midi-olk-s", sku: "DRP-SKT-004-OLK-S", size: "S", color: "Olive Khaki", colorCode: "#444B38", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-olk-m", sku: "DRP-SKT-004-OLK-M", size: "M", color: "Olive Khaki", colorCode: "#444B38", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-olk-l", sku: "DRP-SKT-004-OLK-L", size: "L", color: "Olive Khaki", colorCode: "#444B38", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-olk-xl", sku: "DRP-SKT-004-OLK-XL", size: "XL", color: "Olive Khaki", colorCode: "#444B38", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-004-aline-midi-crm-xs", sku: "DRP-SKT-004-CRM-XS", size: "XS", color: "Warm Cream", colorCode: "#F0EBDC", inStock: true, quantity: 17, isActive: true },
      { id: "var-skirt-004-aline-midi-crm-s", sku: "DRP-SKT-004-CRM-S", size: "S", color: "Warm Cream", colorCode: "#F0EBDC", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-crm-m", sku: "DRP-SKT-004-CRM-M", size: "M", color: "Warm Cream", colorCode: "#F0EBDC", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-crm-l", sku: "DRP-SKT-004-CRM-L", size: "L", color: "Warm Cream", colorCode: "#F0EBDC", inStock: true, quantity: 28, isActive: true },
      { id: "var-skirt-004-aline-midi-crm-xl", sku: "DRP-SKT-004-CRM-XL", size: "XL", color: "Warm Cream", colorCode: "#F0EBDC", inStock: true, quantity: 17, isActive: true },
    ],
  },
  {
    id: "prod-dress-001-sleeveless-mini",
    slug: "basic-sleeveless-mini-dress",
    sku: "DRP-DRS-001",
    name: "Basic Sleeveless Mini Dress",
    shortDescription: "Clean scoop-neck shift mini dress in lightweight stretch woven fabric.",
    description: "Effortless sleeveless mini dress featuring a rounded scoop neckline and gentle A-line shift silhouette. Easy to dress up with boots or down with casual sneakers.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: createPrice(7800),
    material: "95% Viscose, 5% Elastane",
    careInstructions: [
      "Machine wash cold delicate",
      "Do not tumble dry",
      "Low iron"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for shift dress silhouettes.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Classic Black",
            "code": "#1A1A1C"
      },
      {
            "name": "Ivory White",
            "code": "#F4F1EC"
      },
      {
            "name": "Sand Beige",
            "code": "#D8CAB2"
      }
],
    images: [
      {
        id: "img-dress-001-sleeveless-mini-classic-black-front",
        url: "/images/products/dresses/sleeveless-mini/black-front.webp",
        alt: "Basic Sleeveless Mini Dress in Classic Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Classic Black",
        view: "front",
      },
      {
        id: "img-dress-001-sleeveless-mini-ivory-white-front",
        url: "/images/products/dresses/sleeveless-mini/white-front.webp",
        alt: "Basic Sleeveless Mini Dress in Ivory White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Ivory White",
        view: "front",
      },
      {
        id: "img-dress-001-sleeveless-mini-sand-beige-front",
        url: "/images/products/dresses/sleeveless-mini/beige-front.webp",
        alt: "Basic Sleeveless Mini Dress in Sand Beige - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Sand Beige",
        view: "front",
      },
    ],
    variants: [
      { id: "var-dress-001-sleeveless-mini-blk-xs", sku: "DRP-DRS-001-BLK-XS", size: "XS", color: "Classic Black", colorCode: "#1A1A1C", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-001-sleeveless-mini-blk-s", sku: "DRP-DRS-001-BLK-S", size: "S", color: "Classic Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-blk-m", sku: "DRP-DRS-001-BLK-M", size: "M", color: "Classic Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-blk-l", sku: "DRP-DRS-001-BLK-L", size: "L", color: "Classic Black", colorCode: "#1A1A1C", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-ivw-xs", sku: "DRP-DRS-001-IVW-XS", size: "XS", color: "Ivory White", colorCode: "#F4F1EC", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-001-sleeveless-mini-ivw-s", sku: "DRP-DRS-001-IVW-S", size: "S", color: "Ivory White", colorCode: "#F4F1EC", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-ivw-m", sku: "DRP-DRS-001-IVW-M", size: "M", color: "Ivory White", colorCode: "#F4F1EC", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-ivw-l", sku: "DRP-DRS-001-IVW-L", size: "L", color: "Ivory White", colorCode: "#F4F1EC", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-bge-xs", sku: "DRP-DRS-001-BGE-XS", size: "XS", color: "Sand Beige", colorCode: "#D8CAB2", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-001-sleeveless-mini-bge-s", sku: "DRP-DRS-001-BGE-S", size: "S", color: "Sand Beige", colorCode: "#D8CAB2", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-bge-m", sku: "DRP-DRS-001-BGE-M", size: "M", color: "Sand Beige", colorCode: "#D8CAB2", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-001-sleeveless-mini-bge-l", sku: "DRP-DRS-001-BGE-L", size: "L", color: "Sand Beige", colorCode: "#D8CAB2", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-dress-002-shortsleeve-mini",
    slug: "simple-short-sleeve-mini-dress",
    sku: "DRP-DRS-002",
    name: "Simple Short-Sleeve Mini Dress",
    shortDescription: "Casual crewneck t-shirt mini dress cut from soft breathable cotton jersey.",
    description: "The ultimate one-and-done casual dress. Cut with a relaxed crewneck, short sleeves, and a flattering straight cut in soft 200 GSM cotton.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: createPrice(7400),
    material: "100% Combed Cotton Jersey (200 GSM)",
    careInstructions: [
      "Machine wash warm with like colours",
      "Tumble dry low",
      "Medium iron"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for t-shirt dress silhouettes.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL"],
    availableColors: [
      {
            "name": "Black",
            "code": "#18181A"
      },
      {
            "name": "Navy Blue",
            "code": "#1C2A3D"
      },
      {
            "name": "Muted Olive",
            "code": "#48523D"
      }
],
    images: [
      {
        id: "img-dress-002-shortsleeve-mini-black-front",
        url: "/images/products/dresses/shortsleeve-mini/black-front.webp",
        alt: "Simple Short-Sleeve Mini Dress in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-dress-002-shortsleeve-mini-navy-blue-front",
        url: "/images/products/dresses/shortsleeve-mini/navy-front.webp",
        alt: "Simple Short-Sleeve Mini Dress in Navy Blue - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-dress-002-shortsleeve-mini-muted-olive-front",
        url: "/images/products/dresses/shortsleeve-mini/olive-front.webp",
        alt: "Simple Short-Sleeve Mini Dress in Muted Olive - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Muted Olive",
        view: "front",
      },
    ],
    variants: [
      { id: "var-dress-002-shortsleeve-mini-blk-xs", sku: "DRP-DRS-002-BLK-XS", size: "XS", color: "Black", colorCode: "#18181A", inStock: true, quantity: 29, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-blk-s", sku: "DRP-DRS-002-BLK-S", size: "S", color: "Black", colorCode: "#18181A", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-blk-m", sku: "DRP-DRS-002-BLK-M", size: "M", color: "Black", colorCode: "#18181A", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-blk-l", sku: "DRP-DRS-002-BLK-L", size: "L", color: "Black", colorCode: "#18181A", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-blk-xl", sku: "DRP-DRS-002-BLK-XL", size: "XL", color: "Black", colorCode: "#18181A", inStock: true, quantity: 29, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-nvy-xs", sku: "DRP-DRS-002-NVY-XS", size: "XS", color: "Navy Blue", colorCode: "#1C2A3D", inStock: true, quantity: 29, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-nvy-s", sku: "DRP-DRS-002-NVY-S", size: "S", color: "Navy Blue", colorCode: "#1C2A3D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-nvy-m", sku: "DRP-DRS-002-NVY-M", size: "M", color: "Navy Blue", colorCode: "#1C2A3D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-nvy-l", sku: "DRP-DRS-002-NVY-L", size: "L", color: "Navy Blue", colorCode: "#1C2A3D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-nvy-xl", sku: "DRP-DRS-002-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#1C2A3D", inStock: true, quantity: 29, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-mol-xs", sku: "DRP-DRS-002-MOL-XS", size: "XS", color: "Muted Olive", colorCode: "#48523D", inStock: true, quantity: 29, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-mol-s", sku: "DRP-DRS-002-MOL-S", size: "S", color: "Muted Olive", colorCode: "#48523D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-mol-m", sku: "DRP-DRS-002-MOL-M", size: "M", color: "Muted Olive", colorCode: "#48523D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-mol-l", sku: "DRP-DRS-002-MOL-L", size: "L", color: "Muted Olive", colorCode: "#48523D", inStock: true, quantity: 16, isActive: true },
      { id: "var-dress-002-shortsleeve-mini-mol-xl", sku: "DRP-DRS-002-MOL-XL", size: "XL", color: "Muted Olive", colorCode: "#48523D", inStock: true, quantity: 29, isActive: true },
    ],
  },
  {
    id: "prod-dress-003-minimalist-slip",
    slug: "minimalist-slip-dress",
    sku: "DRP-DRS-003",
    name: "Minimalist Slip Dress",
    shortDescription: "Fluid bias-cut slip dress with delicate adjustable spaghetti straps in satin twill.",
    description: "Cut on the bias to drape effortlessly over natural curves. Featuring an elegant soft V-neckline, side split hem, and silky matte luster.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: createPrice(9500),
    material: "100% Recycled Poly-Satin Twill",
    careInstructions: [
      "Cold hand wash or delicate cycle",
      "Do not tumble dry",
      "Cool iron on reverse"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for delicate strap slip silhouettes.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Black",
            "code": "#18181A"
      },
      {
            "name": "Champagne Cream",
            "code": "#E8DFC8"
      },
      {
            "name": "Deep Burgundy",
            "code": "#581926"
      }
],
    images: [
      {
        id: "img-dress-003-minimalist-slip-black-front",
        url: "/images/products/dresses/slip-dress/black-front.webp",
        alt: "Minimalist Slip Dress in Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Black",
        view: "front",
      },
      {
        id: "img-dress-003-minimalist-slip-champagne-cream-front",
        url: "/images/products/dresses/slip-dress/champagne-front.webp",
        alt: "Minimalist Slip Dress in Champagne Cream - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Champagne Cream",
        view: "front",
      },
      {
        id: "img-dress-003-minimalist-slip-deep-burgundy-front",
        url: "/images/products/dresses/slip-dress/burgundy-front.webp",
        alt: "Minimalist Slip Dress in Deep Burgundy - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Deep Burgundy",
        view: "front",
      },
    ],
    variants: [
      { id: "var-dress-003-minimalist-slip-blk-xs", sku: "DRP-DRS-003-BLK-XS", size: "XS", color: "Black", colorCode: "#18181A", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-003-minimalist-slip-blk-s", sku: "DRP-DRS-003-BLK-S", size: "S", color: "Black", colorCode: "#18181A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-blk-m", sku: "DRP-DRS-003-BLK-M", size: "M", color: "Black", colorCode: "#18181A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-blk-l", sku: "DRP-DRS-003-BLK-L", size: "L", color: "Black", colorCode: "#18181A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-chp-xs", sku: "DRP-DRS-003-CHP-XS", size: "XS", color: "Champagne Cream", colorCode: "#E8DFC8", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-003-minimalist-slip-chp-s", sku: "DRP-DRS-003-CHP-S", size: "S", color: "Champagne Cream", colorCode: "#E8DFC8", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-chp-m", sku: "DRP-DRS-003-CHP-M", size: "M", color: "Champagne Cream", colorCode: "#E8DFC8", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-chp-l", sku: "DRP-DRS-003-CHP-L", size: "L", color: "Champagne Cream", colorCode: "#E8DFC8", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-bur-xs", sku: "DRP-DRS-003-BUR-XS", size: "XS", color: "Deep Burgundy", colorCode: "#581926", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-003-minimalist-slip-bur-s", sku: "DRP-DRS-003-BUR-S", size: "S", color: "Deep Burgundy", colorCode: "#581926", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-bur-m", sku: "DRP-DRS-003-BUR-M", size: "M", color: "Deep Burgundy", colorCode: "#581926", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-003-minimalist-slip-bur-l", sku: "DRP-DRS-003-BUR-L", size: "L", color: "Deep Burgundy", colorCode: "#581926", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-dress-004-bodycon-mini",
    slug: "basic-bodycon-mini-dress",
    sku: "DRP-DRS-004",
    name: "Basic Bodycon Mini Dress",
    shortDescription: "Form-fitting ribbed jersey mini dress with flattering contour stretch.",
    description: "A sleek bodycon silhouette crafted in heavyweight ribbed jersey that sculpts and smooths without restricting movement.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: createPrice(6800),
    material: "92% Modal, 8% Spandex Rib",
    careInstructions: [
      "Machine wash cold inside out",
      "Dry flat",
      "Do not tumble dry"
],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bodycon stretch silhouettes.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L"],
    availableColors: [
      {
            "name": "Jet Black",
            "code": "#171719"
      },
      {
            "name": "Heather Grey",
            "code": "#85878C"
      },
      {
            "name": "Rich Burgundy",
            "code": "#5C1A27"
      }
],
    images: [
      {
        id: "img-dress-004-bodycon-mini-jet-black-front",
        url: "/images/products/dresses/bodycon-mini/black-front.webp",
        alt: "Basic Bodycon Mini Dress in Jet Black - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Jet Black",
        view: "front",
      },
      {
        id: "img-dress-004-bodycon-mini-heather-grey-front",
        url: "/images/products/dresses/bodycon-mini/grey-front.webp",
        alt: "Basic Bodycon Mini Dress in Heather Grey - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Heather Grey",
        view: "front",
      },
      {
        id: "img-dress-004-bodycon-mini-rich-burgundy-front",
        url: "/images/products/dresses/bodycon-mini/burgundy-front.webp",
        alt: "Basic Bodycon Mini Dress in Rich Burgundy - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Rich Burgundy",
        view: "front",
      },
    ],
    variants: [
      { id: "var-dress-004-bodycon-mini-jbk-xs", sku: "DRP-DRS-004-JBK-XS", size: "XS", color: "Jet Black", colorCode: "#171719", inStock: true, quantity: 21, isActive: true },
      { id: "var-dress-004-bodycon-mini-jbk-s", sku: "DRP-DRS-004-JBK-S", size: "S", color: "Jet Black", colorCode: "#171719", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-jbk-m", sku: "DRP-DRS-004-JBK-M", size: "M", color: "Jet Black", colorCode: "#171719", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-jbk-l", sku: "DRP-DRS-004-JBK-L", size: "L", color: "Jet Black", colorCode: "#171719", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-hgy-xs", sku: "DRP-DRS-004-HGY-XS", size: "XS", color: "Heather Grey", colorCode: "#85878C", inStock: true, quantity: 21, isActive: true },
      { id: "var-dress-004-bodycon-mini-hgy-s", sku: "DRP-DRS-004-HGY-S", size: "S", color: "Heather Grey", colorCode: "#85878C", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-hgy-m", sku: "DRP-DRS-004-HGY-M", size: "M", color: "Heather Grey", colorCode: "#85878C", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-hgy-l", sku: "DRP-DRS-004-HGY-L", size: "L", color: "Heather Grey", colorCode: "#85878C", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-rbg-xs", sku: "DRP-DRS-004-RBG-XS", size: "XS", color: "Rich Burgundy", colorCode: "#5C1A27", inStock: true, quantity: 21, isActive: true },
      { id: "var-dress-004-bodycon-mini-rbg-s", sku: "DRP-DRS-004-RBG-S", size: "S", color: "Rich Burgundy", colorCode: "#5C1A27", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-rbg-m", sku: "DRP-DRS-004-RBG-M", size: "M", color: "Rich Burgundy", colorCode: "#5C1A27", inStock: true, quantity: 12, isActive: true },
      { id: "var-dress-004-bodycon-mini-rbg-l", sku: "DRP-DRS-004-RBG-L", size: "L", color: "Rich Burgundy", colorCode: "#5C1A27", inStock: true, quantity: 12, isActive: true },
    ],
  },
  {
    id: "prod-dress-005-everyday-cotton",
    slug: "simple-everyday-cotton-dress",
    sku: "DRP-DRS-005",
    name: "Simple Everyday Cotton Dress",
    shortDescription: "Relaxed A-line midi dress with short sleeves and side pockets in pure cotton.",
    description: "An effortless daily staple cut from pure washed cotton with an easy A-line skirt, neat crew neckline, and functional hidden side seam pockets.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: createPrice(8800),
    material: "100% Breathable Washed Cotton (180 GSM)",
    careInstructions: [
      "Machine wash warm",
      "Tumble dry medium",
      "Warm iron"
],
    tryOn: {
      available: true,
      garmentId: "dress-midi",
      explanation: "3D virtual try-on available with full physical drape simulation on midi dress pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-01T08:00:00Z",
    availableSizes: ["XS","S","M","L","XL"],
    availableColors: [
      {
            "name": "Navy Blue",
            "code": "#18223A"
      },
      {
            "name": "Crisp White",
            "code": "#F5F3EE"
      },
      {
            "name": "Terracotta",
            "code": "#B45546"
      }
],
    images: [
      {
        id: "img-dress-005-everyday-cotton-navy-blue-front",
        url: "/images/products/dresses/everyday-cotton/navy-front.webp",
        alt: "Simple Everyday Cotton Dress in Navy Blue - Front View",
        isPrimary: true,
        displayOrder: 0,
        color: "Navy Blue",
        view: "front",
      },
      {
        id: "img-dress-005-everyday-cotton-crisp-white-front",
        url: "/images/products/dresses/everyday-cotton/white-front.webp",
        alt: "Simple Everyday Cotton Dress in Crisp White - Front View",
        isPrimary: false,
        displayOrder: 1,
        color: "Crisp White",
        view: "front",
      },
      {
        id: "img-dress-005-everyday-cotton-terracotta-front",
        url: "/images/products/dresses/everyday-cotton/terracotta-front.webp",
        alt: "Simple Everyday Cotton Dress in Terracotta - Front View",
        isPrimary: false,
        displayOrder: 2,
        color: "Terracotta",
        view: "front",
      },
    ],
    variants: [
      { id: "var-dress-005-everyday-cotton-nvy-xs", sku: "DRP-DRS-005-NVY-XS", size: "XS", color: "Navy Blue", colorCode: "#18223A", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-005-everyday-cotton-nvy-s", sku: "DRP-DRS-005-NVY-S", size: "S", color: "Navy Blue", colorCode: "#18223A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-nvy-m", sku: "DRP-DRS-005-NVY-M", size: "M", color: "Navy Blue", colorCode: "#18223A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-nvy-l", sku: "DRP-DRS-005-NVY-L", size: "L", color: "Navy Blue", colorCode: "#18223A", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-nvy-xl", sku: "DRP-DRS-005-NVY-XL", size: "XL", color: "Navy Blue", colorCode: "#18223A", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-005-everyday-cotton-cri-xs", sku: "DRP-DRS-005-CRI-XS", size: "XS", color: "Crisp White", colorCode: "#F5F3EE", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-005-everyday-cotton-cri-s", sku: "DRP-DRS-005-CRI-S", size: "S", color: "Crisp White", colorCode: "#F5F3EE", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-cri-m", sku: "DRP-DRS-005-CRI-M", size: "M", color: "Crisp White", colorCode: "#F5F3EE", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-cri-l", sku: "DRP-DRS-005-CRI-L", size: "L", color: "Crisp White", colorCode: "#F5F3EE", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-cri-xl", sku: "DRP-DRS-005-CRI-XL", size: "XL", color: "Crisp White", colorCode: "#F5F3EE", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-005-everyday-cotton-ter-xs", sku: "DRP-DRS-005-TER-XS", size: "XS", color: "Terracotta", colorCode: "#B45546", inStock: true, quantity: 27, isActive: true },
      { id: "var-dress-005-everyday-cotton-ter-s", sku: "DRP-DRS-005-TER-S", size: "S", color: "Terracotta", colorCode: "#B45546", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-ter-m", sku: "DRP-DRS-005-TER-M", size: "M", color: "Terracotta", colorCode: "#B45546", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-ter-l", sku: "DRP-DRS-005-TER-L", size: "L", color: "Terracotta", colorCode: "#B45546", inStock: true, quantity: 15, isActive: true },
      { id: "var-dress-005-everyday-cotton-ter-xl", sku: "DRP-DRS-005-TER-XL", size: "XL", color: "Terracotta", colorCode: "#B45546", inStock: true, quantity: 27, isActive: true },
    ],
  },
];
