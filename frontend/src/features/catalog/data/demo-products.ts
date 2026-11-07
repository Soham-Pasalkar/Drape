/**
 * DRAPE Canonical Demonstration Product Catalog.
 *
 * Exactly 18 luxury ready-to-wear items across 6 balanced categories:
 * - 5 Tops
 * - 3 Shirts
 * - 3 Trousers
 * - 3 Outerwear
 * - 2 Dresses
 * - 2 Skirts
 *
 * Mapped strictly to existing 3D GLB assets in frontend/src/lib/ar/garment-registry.ts.
 * Products without compatible 3D assets explicitly have tryOn.available = false and garmentId = null.
 */

import { Product } from "../types";
import { createPrice } from "../utils/product-mapping";

export const DEMO_PRODUCTS: Product[] = [
  // ==========================================
  // TOPS (5 Products) - 3D Models Available
  // ==========================================
  {
    id: "prod-top-001-classic-crew",
    slug: "atelier-classic-crew-tee",
    sku: "DRP-TOP-001",
    name: "Atelier Classic Crew Tee",
    shortDescription: "Precision-tailored classic crew-neck in 240 GSM combed Egyptian cotton jersey.",
    description:
      "Crafted from premium long-staple Egyptian cotton jersey with a smooth compact hand. Cut with a clean neckline rib and balanced drop-tail hem. Designed as an enduring foundation piece with structured shoulder seams that hold their form through everyday wear.",
    category: "tops",
    brand: "DRAPE Atelier",
    price: createPrice(18000), // $180.00
    material: "100% Combed Egyptian Cotton (240 GSM)",
    careInstructions: [
      "Machine wash delicate cold (30°C)",
      "Do not bleach or tumble dry",
      "Reshape and dry flat in shade",
      "Cool iron on reverse",
    ],
    tryOn: {
      available: true,
      garmentId: "tshirt-crewneck",
      explanation: "Full 3D physical simulation mapped to classic crewneck pattern.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-01T08:00:00Z",
    availableSizes: ["XS", "S", "M", "L", "XL"],
    availableColors: [
      { name: "Noir", code: "#111111" },
      { name: "Bone", code: "#E8E4DF" },
      { name: "Optical White", code: "#FFFFFF" },
    ],
    images: [
      {
        id: "img-top-001-1",
        url: "/images/collection-essentials.jpg",
        alt: "Atelier Classic Crew Tee front view",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-top-001-2",
        url: "/images/look-1-item1.jpg",
        alt: "Atelier Classic Crew Tee textile detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-top-001-blk-xs", sku: "DRP-TOP-001-BLK-XS", size: "XS", color: "Noir", colorCode: "#111111", inStock: true, quantity: 12, isActive: true },
      { id: "var-top-001-blk-s", sku: "DRP-TOP-001-BLK-S", size: "S", color: "Noir", colorCode: "#111111", inStock: true, quantity: 20, isActive: true },
      { id: "var-top-001-blk-m", sku: "DRP-TOP-001-BLK-M", size: "M", color: "Noir", colorCode: "#111111", inStock: true, quantity: 25, isActive: true },
      { id: "var-top-001-blk-l", sku: "DRP-TOP-001-BLK-L", size: "L", color: "Noir", colorCode: "#111111", inStock: true, quantity: 15, isActive: true },
      { id: "var-top-001-blk-xl", sku: "DRP-TOP-001-BLK-XL", size: "XL", color: "Noir", colorCode: "#111111", inStock: true, quantity: 8, isActive: true },
      { id: "var-top-001-bon-s", sku: "DRP-TOP-001-BON-S", size: "S", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 14, isActive: true },
      { id: "var-top-001-bon-m", sku: "DRP-TOP-001-BON-M", size: "M", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 18, isActive: true },
      { id: "var-top-001-bon-l", sku: "DRP-TOP-001-BON-L", size: "L", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 10, isActive: true },
      { id: "var-top-001-wht-m", sku: "DRP-TOP-001-WHT-M", size: "M", color: "Optical White", colorCode: "#FFFFFF", inStock: true, quantity: 16, isActive: true },
      { id: "var-top-001-wht-l", sku: "DRP-TOP-001-WHT-L", size: "L", color: "Optical White", colorCode: "#FFFFFF", inStock: true, quantity: 11, isActive: true },
    ],
  },
  {
    id: "prod-top-002-heavyweight-boxy",
    slug: "heavyweight-boxy-tee",
    sku: "DRP-TOP-002",
    name: "Heavyweight Boxy Tee",
    shortDescription: "Drop-shoulder relaxed silhouette crafted from 320 GSM dry-touch organic cotton.",
    description:
      "A structural statement tee cut with generous body volume, dropped armholes, and elongated sleeves. Knitted from heavyweight 320 GSM organic ring-spun cotton that preserves an architectural silhouette without clinging. Stone-washed for a matte tactile finish.",
    category: "tops",
    brand: "DRAPE Atelier",
    price: createPrice(22000), // $220.00
    material: "100% Organic Dry-Touch Cotton (320 GSM)",
    careInstructions: [
      "Machine wash cold inside out",
      "Do not tumble dry",
      "Medium iron if needed",
      "Dry cleanable",
    ],
    tryOn: {
      available: true,
      garmentId: "tshirt-oversized",
      explanation: "3D try-on mapped to oversized drop-shoulder pattern geometry.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-03T10:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Bone", code: "#E8E4DF" },
      { name: "Washed Black", code: "#2B2A29" },
      { name: "Concrete", code: "#8E8D8A" },
    ],
    images: [
      {
        id: "img-top-002-1",
        url: "/images/collection-streetwear.jpg",
        alt: "Heavyweight Boxy Tee front silhouette",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-top-002-2",
        url: "/images/look-1-main.jpg",
        alt: "Heavyweight Boxy Tee model studio shot",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-top-002-bon-s", sku: "DRP-TOP-002-BON-S", size: "S", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 15, isActive: true },
      { id: "var-top-002-bon-m", sku: "DRP-TOP-002-BON-M", size: "M", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 22, isActive: true },
      { id: "var-top-002-bon-l", sku: "DRP-TOP-002-BON-L", size: "L", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 18, isActive: true },
      { id: "var-top-002-bon-xl", sku: "DRP-TOP-002-BON-XL", size: "XL", color: "Bone", colorCode: "#E8E4DF", inStock: true, quantity: 7, isActive: true },
      { id: "var-top-002-blk-m", sku: "DRP-TOP-002-BLK-M", size: "M", color: "Washed Black", colorCode: "#2B2A29", inStock: true, quantity: 19, isActive: true },
      { id: "var-top-002-blk-l", sku: "DRP-TOP-002-BLK-L", size: "L", color: "Washed Black", colorCode: "#2B2A29", inStock: true, quantity: 14, isActive: true },
      { id: "var-top-002-cnc-m", sku: "DRP-TOP-002-CNC-M", size: "M", color: "Concrete", colorCode: "#8E8D8A", inStock: true, quantity: 8, isActive: true },
    ],
  },
  {
    id: "prod-top-003-sculpted-rib",
    slug: "sculpted-ribbed-slim-tee",
    sku: "DRP-TOP-003",
    name: "Sculpted Ribbed Slim Tee",
    shortDescription: "Form-tracing micro-ribbed modal jersey for an understated, sharp profile.",
    description:
      "A refined second-skin silhouette developed in a dense modal micro-rib with high recovery. Features narrow shoulder straps, a higher contour collar, and a clean blind-stitched hem that hugs the torso without compression.",
    category: "tops",
    brand: "DRAPE Atelier",
    price: createPrice(19500), // $195.00
    material: "92% Micro-Modal, 8% Elastane (210 GSM)",
    careInstructions: [
      "Hand wash cold with mild detergent",
      "Do not wring or tumble dry",
      "Dry flat in shade",
      "Steam gently",
    ],
    tryOn: {
      available: true,
      garmentId: "tshirt-fitted",
      explanation: "3D try-on mapped to sculpted close-contour body profile.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-05T11:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Anthracite", code: "#343330" },
      { name: "Espresso", code: "#29221D" },
      { name: "Ivory", code: "#F5F2EB" },
    ],
    images: [
      {
        id: "img-top-003-1",
        url: "/images/glamorous-woman-black-bodysuit-covering-her-eyes_197531-12938.avif",
        alt: "Sculpted Ribbed Slim Tee silhouette",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-top-003-2",
        url: "/images/edit-spread-1.jpg",
        alt: "Sculpted Ribbed Slim Tee editorial studio shot",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-top-003-ant-xs", sku: "DRP-TOP-003-ANT-XS", size: "XS", color: "Anthracite", colorCode: "#343330", inStock: true, quantity: 10, isActive: true },
      { id: "var-top-003-ant-s", sku: "DRP-TOP-003-ANT-S", size: "S", color: "Anthracite", colorCode: "#343330", inStock: true, quantity: 18, isActive: true },
      { id: "var-top-003-ant-m", sku: "DRP-TOP-003-ANT-M", size: "M", color: "Anthracite", colorCode: "#343330", inStock: true, quantity: 14, isActive: true },
      { id: "var-top-003-ant-l", sku: "DRP-TOP-003-ANT-L", size: "L", color: "Anthracite", colorCode: "#343330", inStock: true, quantity: 9, isActive: true },
      { id: "var-top-003-esp-s", sku: "DRP-TOP-003-ESP-S", size: "S", color: "Espresso", colorCode: "#29221D", inStock: true, quantity: 12, isActive: true },
      { id: "var-top-003-esp-m", sku: "DRP-TOP-003-ESP-M", size: "M", color: "Espresso", colorCode: "#29221D", inStock: true, quantity: 16, isActive: true },
      { id: "var-top-003-ivo-s", sku: "DRP-TOP-003-IVO-S", size: "S", color: "Ivory", colorCode: "#F5F2EB", inStock: true, quantity: 7, isActive: true },
      { id: "var-top-003-ivo-m", sku: "DRP-TOP-003-IVO-M", size: "M", color: "Ivory", colorCode: "#F5F2EB", inStock: true, quantity: 11, isActive: true },
    ],
  },
  {
    id: "prod-top-004-cashmere-ls",
    slug: "cashmere-long-sleeve-top",
    sku: "DRP-TOP-004",
    name: "Cashmere Long-Sleeve Top",
    shortDescription: "Pure 16-gauge Mongolian cashmere with elongated cuffs and saddle shoulders.",
    description:
      "Spun from exceptionally fine Mongolian cashmere fibers in a light, featherweight 16-gauge knit. Features refined saddle shoulder construction, ribbed micro-collars, and elongated cuffs designed to gather gracefully at the wrists.",
    category: "tops",
    brand: "DRAPE Atelier",
    price: createPrice(48000), // $480.00
    material: "100% 16-Gauge Mongolian Cashmere (260 GSM)",
    careInstructions: [
      "Specialist dry clean or hand wash cold with wool wash",
      "Do not wring; press in towel",
      "Dry flat on clean surface",
      "Store folded with cedar blocks",
    ],
    tryOn: {
      available: true,
      garmentId: "top-longsleeve",
      explanation: "3D try-on mapped to cashmere long-sleeve knitwear mesh.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-08T14:30:00Z",
    availableSizes: ["XS", "S", "M", "L", "XL"],
    availableColors: [
      { name: "Camel", code: "#8C7B6C" },
      { name: "Midnight Noir", code: "#0F1115" },
      { name: "Heather Sand", code: "#C8BDB2" },
    ],
    images: [
      {
        id: "img-top-004-1",
        url: "/images/collection-classics.jpg",
        alt: "Cashmere Long-Sleeve Top editorial view",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-top-004-2",
        url: "/images/edit-spread-2.jpg",
        alt: "Cashmere Long-Sleeve Top knitwear detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-top-004-cam-xs", sku: "DRP-TOP-004-CAM-XS", size: "XS", color: "Camel", colorCode: "#8C7B6C", inStock: true, quantity: 6, isActive: true },
      { id: "var-top-004-cam-s", sku: "DRP-TOP-004-CAM-S", size: "S", color: "Camel", colorCode: "#8C7B6C", inStock: true, quantity: 14, isActive: true },
      { id: "var-top-004-cam-m", sku: "DRP-TOP-004-CAM-M", size: "M", color: "Camel", colorCode: "#8C7B6C", inStock: true, quantity: 16, isActive: true },
      { id: "var-top-004-cam-l", sku: "DRP-TOP-004-CAM-L", size: "L", color: "Camel", colorCode: "#8C7B6C", inStock: true, quantity: 8, isActive: true },
      { id: "var-top-004-cam-xl", sku: "DRP-TOP-004-CAM-XL", size: "XL", color: "Camel", colorCode: "#8C7B6C", inStock: false, quantity: 0, isActive: true },
      { id: "var-top-004-noi-s", sku: "DRP-TOP-004-NOI-S", size: "S", color: "Midnight Noir", colorCode: "#0F1115", inStock: true, quantity: 12, isActive: true },
      { id: "var-top-004-noi-m", sku: "DRP-TOP-004-NOI-M", size: "M", color: "Midnight Noir", colorCode: "#0F1115", inStock: true, quantity: 15, isActive: true },
      { id: "var-top-004-noi-l", sku: "DRP-TOP-004-NOI-L", size: "L", color: "Midnight Noir", colorCode: "#0F1115", inStock: true, quantity: 9, isActive: true },
      { id: "var-top-004-snd-m", sku: "DRP-TOP-004-SND-M", size: "M", color: "Heather Sand", colorCode: "#C8BDB2", inStock: true, quantity: 10, isActive: true },
    ],
  },
  {
    id: "prod-top-005-silk-halter",
    slug: "silk-georgette-halter-top",
    sku: "DRP-TOP-005",
    name: "Silk Georgette Halter Top",
    shortDescription: "Minimalist high-neck sleeveless shell cut on the bias in double-faced silk.",
    description:
      "A fluid bias-cut evening top cut from pure Mulberry silk georgette with a natural, subtle sheen. Designed with a gentle high-neck halter drape, keyhole fastening at the nape, and an asymmetric diagonal hemline.",
    category: "tops",
    brand: "DRAPE Atelier",
    price: createPrice(34000), // $340.00
    material: "100% Double-Faced Silk Georgette (140 GSM)",
    careInstructions: [
      "Dry clean only by luxury silk specialist",
      "Do not spray perfume directly on silk",
      "Cool iron on reverse under pressing cloth",
    ],
    tryOn: {
      available: true,
      garmentId: "top-sleeveless",
      explanation: "3D try-on mapped to high-neck halter shell pattern.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-10T16:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Obsidian", code: "#0D131A" },
      { name: "Champagne", code: "#ECE6DC" },
      { name: "Forest", code: "#1A2520" },
    ],
    images: [
      {
        id: "img-top-005-1",
        url: "/images/portrait-young-happy-woman-studio_1303-13802.avif",
        alt: "Silk Georgette Halter Top studio look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-top-005-2",
        url: "/images/edit-spread-3.jpg",
        alt: "Silk Georgette Halter Top textile movement",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-top-005-obs-xs", sku: "DRP-TOP-005-OBS-XS", size: "XS", color: "Obsidian", colorCode: "#0D131A", inStock: true, quantity: 8, isActive: true },
      { id: "var-top-005-obs-s", sku: "DRP-TOP-005-OBS-S", size: "S", color: "Obsidian", colorCode: "#0D131A", inStock: true, quantity: 14, isActive: true },
      { id: "var-top-005-obs-m", sku: "DRP-TOP-005-OBS-M", size: "M", color: "Obsidian", colorCode: "#0D131A", inStock: true, quantity: 12, isActive: true },
      { id: "var-top-005-obs-l", sku: "DRP-TOP-005-OBS-L", size: "L", color: "Obsidian", colorCode: "#0D131A", inStock: true, quantity: 5, isActive: true },
      { id: "var-top-005-chm-s", sku: "DRP-TOP-005-CHM-S", size: "S", color: "Champagne", colorCode: "#ECE6DC", inStock: true, quantity: 9, isActive: true },
      { id: "var-top-005-chm-m", sku: "DRP-TOP-005-CHM-M", size: "M", color: "Champagne", colorCode: "#ECE6DC", inStock: true, quantity: 11, isActive: true },
      { id: "var-top-005-fst-m", sku: "DRP-TOP-005-FST-M", size: "M", color: "Forest", colorCode: "#1A2520", inStock: true, quantity: 6, isActive: true },
    ],
  },

  // ==========================================
  // SHIRTS (3 Products) - 3D Models In Dev
  // ==========================================
  {
    id: "prod-sht-001-relaxed-oxford",
    slug: "relaxed-oxford-poplin-shirt",
    sku: "DRP-SHT-001",
    name: "Relaxed Oxford Poplin Shirt",
    shortDescription: "Tailored poplin shirt with relaxed proportions and mother-of-pearl buttons.",
    description:
      "A modern interpretation of the classic Oxford shirt woven from fine 140 GSM Giza cotton poplin with a crisp papery touch. Cut with dropped shoulders, a soft spread collar, curved hem gussets, and genuine Australian mother-of-pearl buttons.",
    category: "shirts",
    brand: "DRAPE Atelier",
    price: createPrice(32000), // $320.00
    material: "100% Giza Cotton Poplin (140 GSM)",
    careInstructions: [
      "Machine wash warm (40°C)",
      "Warm iron under pressing cloth",
      "Do not tumble dry",
      "Professional dry clean friendly",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for collared button-front shirting.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-12T09:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Sky Blue", code: "#7A9EC7" },
      { name: "Chalk White", code: "#F8F8F6" },
      { name: "Striped Navy", code: "#1B2838" },
    ],
    images: [
      {
        id: "img-sht-001-1",
        url: "/images/Mens-Fashion-Photoshoot-SHARP-Magazine-September-8-2026-7.jpg",
        alt: "Relaxed Oxford Poplin Shirt editorial shoot",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-sht-001-2",
        url: "/images/collection-essentials.jpg",
        alt: "Relaxed Oxford Poplin Shirt collar detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-sht-001-sky-s", sku: "DRP-SHT-001-SKY-S", size: "S", color: "Sky Blue", colorCode: "#7A9EC7", inStock: true, quantity: 10, isActive: true },
      { id: "var-sht-001-sky-m", sku: "DRP-SHT-001-SKY-M", size: "M", color: "Sky Blue", colorCode: "#7A9EC7", inStock: true, quantity: 18, isActive: true },
      { id: "var-sht-001-sky-l", sku: "DRP-SHT-001-SKY-L", size: "L", color: "Sky Blue", colorCode: "#7A9EC7", inStock: true, quantity: 12, isActive: true },
      { id: "var-sht-001-sky-xl", sku: "DRP-SHT-001-SKY-XL", size: "XL", color: "Sky Blue", colorCode: "#7A9EC7", inStock: true, quantity: 6, isActive: true },
      { id: "var-sht-001-wht-m", sku: "DRP-SHT-001-WHT-M", size: "M", color: "Chalk White", colorCode: "#F8F8F6", inStock: true, quantity: 20, isActive: true },
      { id: "var-sht-001-wht-l", sku: "DRP-SHT-001-WHT-L", size: "L", color: "Chalk White", colorCode: "#F8F8F6", inStock: true, quantity: 15, isActive: true },
      { id: "var-sht-001-nvy-m", sku: "DRP-SHT-001-NVY-M", size: "M", color: "Striped Navy", colorCode: "#1B2838", inStock: true, quantity: 8, isActive: true },
    ],
  },
  {
    id: "prod-sht-002-structured-dress",
    slug: "structured-minimalist-dress-shirt",
    sku: "DRP-SHT-002",
    name: "Structured Minimalist Dress Shirt",
    shortDescription: "Crisp architectural dress shirt in Egyptian Mako cotton with concealed placket.",
    description:
      "A formal sartorial essential executed with understated modernism. Features a concealed front button placket, sharp angled French cuffs, back yoke pleating, and an engineered semi-spread collar that sits impeccably with or without tailoring.",
    category: "shirts",
    brand: "DRAPE Atelier",
    price: createPrice(36000), // $360.00
    material: "100% Egyptian Mako Cotton (160 GSM)",
    careInstructions: [
      "Professional laundry or dry clean recommended",
      "Starch lightly if crisp silhouette is desired",
      "Iron on high heat with steam",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for tailored button-front shirting.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-14T11:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Optic White", code: "#FFFFFF" },
      { name: "Deep Raven", code: "#121214" },
    ],
    images: [
      {
        id: "img-sht-002-1",
        url: "/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-1.jpg",
        alt: "Structured Minimalist Dress Shirt editorial front",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-sht-002-2",
        url: "/images/edit-spread-1.jpg",
        alt: "Structured Minimalist Dress Shirt cuff study",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-sht-002-wht-s", sku: "DRP-SHT-002-WHT-S", size: "S", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 12, isActive: true },
      { id: "var-sht-002-wht-m", sku: "DRP-SHT-002-WHT-M", size: "M", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 24, isActive: true },
      { id: "var-sht-002-wht-l", sku: "DRP-SHT-002-WHT-L", size: "L", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 18, isActive: true },
      { id: "var-sht-002-wht-xl", sku: "DRP-SHT-002-WHT-XL", size: "XL", color: "Optic White", colorCode: "#FFFFFF", inStock: true, quantity: 8, isActive: true },
      { id: "var-sht-002-rvn-m", sku: "DRP-SHT-002-RVN-M", size: "M", color: "Deep Raven", colorCode: "#121214", inStock: true, quantity: 14, isActive: true },
      { id: "var-sht-002-rvn-l", sku: "DRP-SHT-002-RVN-L", size: "L", color: "Deep Raven", colorCode: "#121214", inStock: true, quantity: 10, isActive: true },
    ],
  },
  {
    id: "prod-sht-003-silk-resort",
    slug: "fluid-silk-resort-shirt",
    sku: "DRP-SHT-003",
    name: "Fluid Silk Resort Shirt",
    shortDescription: "Camp collar short-sleeve shirt cut from sandwashed Mulberry silk twill.",
    description:
      "Evoking leisurely Mediterranean elegance, this boxy short-sleeve shirt is cut with a relaxed Cuban camp collar and straight vented hem. The sandwashed silk twill lends a velvety peach-skin hand and remarkable drape in motion.",
    category: "shirts",
    brand: "DRAPE Atelier",
    price: createPrice(42000), // $420.00
    material: "100% Sandwashed Silk Twill (18 Momme)",
    careInstructions: [
      "Dry clean only by silk specialist",
      "Do not soak or wring",
      "Cool iron on reverse under silk press cloth",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for collared camp-collar silk shirting.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-16T15:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Sand Pearl", code: "#DED8CE" },
      { name: "Terracotta Shadow", code: "#874E3C" },
      { name: "Olive Noir", code: "#2D332A" },
    ],
    images: [
      {
        id: "img-sht-003-1",
        url: "/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-2.jpg",
        alt: "Fluid Silk Resort Shirt editorial",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-sht-003-2",
        url: "/images/edit-spread-2.jpg",
        alt: "Fluid Silk Resort Shirt fabric study",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-sht-003-snd-s", sku: "DRP-SHT-003-SND-S", size: "S", color: "Sand Pearl", colorCode: "#DED8CE", inStock: true, quantity: 8, isActive: true },
      { id: "var-sht-003-snd-m", sku: "DRP-SHT-003-SND-M", size: "M", color: "Sand Pearl", colorCode: "#DED8CE", inStock: true, quantity: 15, isActive: true },
      { id: "var-sht-003-snd-l", sku: "DRP-SHT-003-SND-L", size: "L", color: "Sand Pearl", colorCode: "#DED8CE", inStock: true, quantity: 11, isActive: true },
      { id: "var-sht-003-ter-m", sku: "DRP-SHT-003-TER-M", size: "M", color: "Terracotta Shadow", colorCode: "#874E3C", inStock: true, quantity: 9, isActive: true },
      { id: "var-sht-003-olv-m", sku: "DRP-SHT-003-OLV-M", size: "M", color: "Olive Noir", colorCode: "#2D332A", inStock: true, quantity: 7, isActive: true },
    ],
  },

  // ==========================================
  // TROUSERS (3 Products) - 3D Models In Dev
  // ==========================================
  {
    id: "prod-trs-001-tailored-wide",
    slug: "tailored-wool-wide-leg-trouser",
    sku: "DRP-TRS-001",
    name: "Tailored Wool Wide-Leg Trouser",
    shortDescription: "High-waist wide-leg trouser cut in Super 120s Italian wool twill with front pleats.",
    description:
      "A commanding wide-leg trouser cut with deep inverted double pleats and an extended waistband tab with internal horn button fastening. The high-twist Super 120s wool falls in an unbroken vertical plane from the hip to shoe brake.",
    category: "trousers",
    brand: "DRAPE Atelier",
    price: createPrice(54000), // $540.00
    material: "100% Super 120s Italian Virgin Wool (310 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Store hanging from cuff hem on clamp hanger",
      "Steam between wears",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated trouser patterns.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-18T12:00:00Z",
    availableSizes: ["XS", "S", "M", "L", "XL"],
    availableColors: [
      { name: "Charcoal Melange", code: "#38393D" },
      { name: "Deep Navy", code: "#101726" },
      { name: "Noir", code: "#111111" },
    ],
    images: [
      {
        id: "img-trs-001-1",
        url: "/images/look-1-main.jpg",
        alt: "Tailored Wool Wide-Leg Trouser full look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-trs-001-2",
        url: "/images/look-1-item2.jpg",
        alt: "Tailored Wool Wide-Leg Trouser pleat detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-trs-001-chr-xs", sku: "DRP-TRS-001-CHR-XS", size: "XS", color: "Charcoal Melange", colorCode: "#38393D", inStock: true, quantity: 6, isActive: true },
      { id: "var-trs-001-chr-s", sku: "DRP-TRS-001-CHR-S", size: "S", color: "Charcoal Melange", colorCode: "#38393D", inStock: true, quantity: 14, isActive: true },
      { id: "var-trs-001-chr-m", sku: "DRP-TRS-001-CHR-M", size: "M", color: "Charcoal Melange", colorCode: "#38393D", inStock: true, quantity: 18, isActive: true },
      { id: "var-trs-001-chr-l", sku: "DRP-TRS-001-CHR-L", size: "L", color: "Charcoal Melange", colorCode: "#38393D", inStock: true, quantity: 10, isActive: true },
      { id: "var-trs-001-chr-xl", sku: "DRP-TRS-001-CHR-XL", size: "XL", color: "Charcoal Melange", colorCode: "#38393D", inStock: true, quantity: 4, isActive: true },
      { id: "var-trs-001-nvy-m", sku: "DRP-TRS-001-NVY-M", size: "M", color: "Deep Navy", colorCode: "#101726", inStock: true, quantity: 12, isActive: true },
      { id: "var-trs-001-nvy-l", sku: "DRP-TRS-001-NVY-L", size: "L", color: "Deep Navy", colorCode: "#101726", inStock: true, quantity: 8, isActive: true },
      { id: "var-trs-001-blk-m", sku: "DRP-TRS-001-BLK-M", size: "M", color: "Noir", colorCode: "#111111", inStock: true, quantity: 15, isActive: true },
    ],
  },
  {
    id: "prod-trs-002-relaxed-chino",
    slug: "relaxed-pleated-chino-trouser",
    sku: "DRP-TRS-002",
    name: "Relaxed Pleated Chino Trouser",
    shortDescription: "High-density Japanese cotton twill trouser with soft taper and side adjusters.",
    description:
      "Subverting utilitarian workwear through refined atelier tailoring. Tailored from high-density Japanese cotton twill with buckled side adjusters, a mid-rise waist, single forward pleats, and a relaxed taper down to clean turned cuffs.",
    category: "trousers",
    brand: "DRAPE Atelier",
    price: createPrice(39000), // $390.00
    material: "100% Japanese High-Density Cotton Twill (290 GSM)",
    careInstructions: [
      "Machine wash cold delicate (30°C)",
      "Do not tumble dry",
      "Iron medium heat while slightly damp",
      "Dry in shade",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated trouser patterns.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-20T10:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Khaki Stone", code: "#C4B7A5" },
      { name: "Black Ink", code: "#181818" },
      { name: "Olive Drab", code: "#44493B" },
    ],
    images: [
      {
        id: "img-trs-002-1",
        url: "/images/edit-spread-3.jpg",
        alt: "Relaxed Pleated Chino Trouser studio look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-trs-002-2",
        url: "/images/look-2-main.jpg",
        alt: "Relaxed Pleated Chino Trouser texture detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-trs-002-khk-s", sku: "DRP-TRS-002-KHK-S", size: "S", color: "Khaki Stone", colorCode: "#C4B7A5", inStock: true, quantity: 10, isActive: true },
      { id: "var-trs-002-khk-m", sku: "DRP-TRS-002-KHK-M", size: "M", color: "Khaki Stone", colorCode: "#C4B7A5", inStock: true, quantity: 16, isActive: true },
      { id: "var-trs-002-khk-l", sku: "DRP-TRS-002-KHK-L", size: "L", color: "Khaki Stone", colorCode: "#C4B7A5", inStock: true, quantity: 11, isActive: true },
      { id: "var-trs-002-khk-xl", sku: "DRP-TRS-002-KHK-XL", size: "XL", color: "Khaki Stone", colorCode: "#C4B7A5", inStock: true, quantity: 5, isActive: true },
      { id: "var-trs-002-ink-m", sku: "DRP-TRS-002-INK-M", size: "M", color: "Black Ink", colorCode: "#181818", inStock: true, quantity: 14, isActive: true },
      { id: "var-trs-002-ink-l", sku: "DRP-TRS-002-INK-L", size: "L", color: "Black Ink", colorCode: "#181818", inStock: true, quantity: 9, isActive: true },
      { id: "var-trs-002-olv-m", sku: "DRP-TRS-002-OLV-M", size: "M", color: "Olive Drab", colorCode: "#44493B", inStock: true, quantity: 8, isActive: true },
    ],
  },
  {
    id: "prod-trs-003-cigarette-pant",
    slug: "fluid-drape-wool-cigarette-pant",
    sku: "DRP-TRS-003",
    name: "Fluid Drape Wool Cigarette Pant",
    shortDescription: "Streamlined narrow trouser in lightweight Italian stretch wool with pressed creases.",
    description:
      "A razor-sharp cigarette silhouette engineered with razor-pressed center creases, a clean waistband sans loops, and discreet side slit pockets. The Italian virgin wool is blended with subtle elastane for flawless crease recovery and movement.",
    category: "trousers",
    brand: "DRAPE Atelier",
    price: createPrice(49000), // $490.00
    material: "98% Virgin Wool, 2% Elastane (240 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Cool iron with pressing cloth",
      "Do not wash in water",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated trouser patterns.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-22T14:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Midnight Black", code: "#0A0A0C" },
      { name: "Dark Slate", code: "#2C3038" },
    ],
    images: [
      {
        id: "img-trs-003-1",
        url: "/images/young-beautiful-woman-business-suit_1303-17721.avif",
        alt: "Fluid Drape Wool Cigarette Pant editorial styling",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-trs-003-2",
        url: "/images/edit-spread-1.jpg",
        alt: "Fluid Drape Wool Cigarette Pant silhouette detail",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-trs-003-blk-xs", sku: "DRP-TRS-003-BLK-XS", size: "XS", color: "Midnight Black", colorCode: "#0A0A0C", inStock: true, quantity: 7, isActive: true },
      { id: "var-trs-003-blk-s", sku: "DRP-TRS-003-BLK-S", size: "S", color: "Midnight Black", colorCode: "#0A0A0C", inStock: true, quantity: 15, isActive: true },
      { id: "var-trs-003-blk-m", sku: "DRP-TRS-003-BLK-M", size: "M", color: "Midnight Black", colorCode: "#0A0A0C", inStock: true, quantity: 12, isActive: true },
      { id: "var-trs-003-blk-l", sku: "DRP-TRS-003-BLK-L", size: "L", color: "Midnight Black", colorCode: "#0A0A0C", inStock: true, quantity: 6, isActive: true },
      { id: "var-trs-003-slt-s", sku: "DRP-TRS-003-SLT-S", size: "S", color: "Dark Slate", colorCode: "#2C3038", inStock: true, quantity: 8, isActive: true },
      { id: "var-trs-003-slt-m", sku: "DRP-TRS-003-SLT-M", size: "M", color: "Dark Slate", colorCode: "#2C3038", inStock: true, quantity: 11, isActive: true },
    ],
  },

  // ==========================================
  // OUTERWEAR & JACKETS (3 Products) - 3D Models In Dev
  // ==========================================
  {
    id: "prod-out-001-sculpted-coat",
    slug: "sculpted-double-faced-wool-overcoat",
    sku: "DRP-OUT-001",
    name: "Sculpted Double-Faced Wool Overcoat",
    shortDescription: "Architectural drop-shoulder overcoat tailored from double-faced Biella virgin wool.",
    description:
      "A monumental outerwear centerpiece meticulously crafted in Biella, Italy from 480 GSM double-faced virgin wool. Designed unlined with pristine hand-finished internal seams, broad notch lapels, horn button closures, and an architectural envelope silhouette.",
    category: "outerwear",
    brand: "DRAPE Atelier",
    price: createPrice(98000), // $980.00
    material: "100% Italian Double-Faced Virgin Wool (480 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Do not wash or tumble dry",
      "Store on shaped broad wooden hanger with dust cover",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for structured heavy outerwear and coats.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-24T08:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Noir", code: "#111111" },
      { name: "Charcoal", code: "#333333" },
      { name: "Camel", code: "#B3906B" },
    ],
    images: [
      {
        id: "img-out-001-1",
        url: "/images/360_F_1770440943_AVX2fcHLSlqcAPX2y4TYHJAYpLx689YU.jpg",
        alt: "Sculpted Double-Faced Wool Overcoat editorial front",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-out-001-2",
        url: "/images/look-1-main.jpg",
        alt: "Sculpted Double-Faced Wool Overcoat full length profile",
        isPrimary: false,
        displayOrder: 1,
      },
      {
        id: "img-out-001-3",
        url: "/images/look-1-item1.jpg",
        alt: "Sculpted Double-Faced Wool Overcoat lapel close-up",
        isPrimary: false,
        displayOrder: 2,
      },
    ],
    variants: [
      { id: "var-out-001-noi-s", sku: "DRP-OUT-001-NOI-S", size: "S", color: "Noir", colorCode: "#111111", inStock: true, quantity: 5, isActive: true },
      { id: "var-out-001-noi-m", sku: "DRP-OUT-001-NOI-M", size: "M", color: "Noir", colorCode: "#111111", inStock: true, quantity: 9, isActive: true },
      { id: "var-out-001-noi-l", sku: "DRP-OUT-001-NOI-L", size: "L", color: "Noir", colorCode: "#111111", inStock: true, quantity: 7, isActive: true },
      { id: "var-out-001-noi-xl", sku: "DRP-OUT-001-NOI-XL", size: "XL", color: "Noir", colorCode: "#111111", inStock: false, quantity: 0, isActive: true },
      { id: "var-out-001-chr-m", sku: "DRP-OUT-001-CHR-M", size: "M", color: "Charcoal", colorCode: "#333333", inStock: true, quantity: 6, isActive: true },
      { id: "var-out-001-chr-l", sku: "DRP-OUT-001-CHR-L", size: "L", color: "Charcoal", colorCode: "#333333", inStock: true, quantity: 4, isActive: true },
      { id: "var-out-001-cam-m", sku: "DRP-OUT-001-CAM-M", size: "M", color: "Camel", colorCode: "#B3906B", inStock: true, quantity: 8, isActive: true },
      { id: "var-out-001-cam-l", sku: "DRP-OUT-001-CAM-L", size: "L", color: "Camel", colorCode: "#B3906B", inStock: true, quantity: 5, isActive: true },
    ],
  },
  {
    id: "prod-out-002-tech-shell",
    slug: "technical-minimalist-shell-jacket",
    sku: "DRP-OUT-002",
    name: "Technical Minimalist Shell Jacket",
    shortDescription: "Waterproof bonded 3-layer technical jacket with concealed matte hardware.",
    description:
      "A purist weather barrier cut with architectural lines. Engineered from Japanese 3-layer bonded polyamide with sealed seams, a waterproof YKK Aquaguard front zipper, articulated sleeves, and an internal storm hem drawcord.",
    category: "outerwear",
    brand: "DRAPE Atelier",
    price: createPrice(76000), // $760.00
    material: "3-Layer Recycled Bonded Polyamide (180 GSM)",
    careInstructions: [
      "Machine wash cold gentle with technical outerwear detergent",
      "Do not use fabric softener or bleach",
      "Line dry in shade",
      "Re-activate DWR with cool iron if needed",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for technical structured jackets.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-26T16:00:00Z",
    availableSizes: ["S", "M", "L", "XL"],
    availableColors: [
      { name: "Graphite", code: "#2A2D32" },
      { name: "Glacier White", code: "#F0F3F4" },
    ],
    images: [
      {
        id: "img-out-002-1",
        url: "/images/handsome-male-fashion-model-lightweight-jacket-male-dress-with-soft-beige-lifestyle-mens-men-portrait-fashion-male-background_171965-43734.avif",
        alt: "Technical Minimalist Shell Jacket front",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-out-002-2",
        url: "/images/collection-streetwear.jpg",
        alt: "Technical Minimalist Shell Jacket street styling",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-out-002-grp-s", sku: "DRP-OUT-002-GRP-S", size: "S", color: "Graphite", colorCode: "#2A2D32", inStock: true, quantity: 6, isActive: true },
      { id: "var-out-002-grp-m", sku: "DRP-OUT-002-GRP-M", size: "M", color: "Graphite", colorCode: "#2A2D32", inStock: true, quantity: 14, isActive: true },
      { id: "var-out-002-grp-l", sku: "DRP-OUT-002-GRP-L", size: "L", color: "Graphite", colorCode: "#2A2D32", inStock: true, quantity: 10, isActive: true },
      { id: "var-out-002-grp-xl", sku: "DRP-OUT-002-GRP-XL", size: "XL", color: "Graphite", colorCode: "#2A2D32", inStock: true, quantity: 4, isActive: true },
      { id: "var-out-002-glc-m", sku: "DRP-OUT-002-GLC-M", size: "M", color: "Glacier White", colorCode: "#F0F3F4", inStock: true, quantity: 9, isActive: true },
      { id: "var-out-002-glc-l", sku: "DRP-OUT-002-GLC-L", size: "L", color: "Glacier White", colorCode: "#F0F3F4", inStock: true, quantity: 7, isActive: true },
    ],
  },
  {
    id: "prod-out-003-wool-blouson",
    slug: "boxy-cropped-wool-blouson",
    sku: "DRP-OUT-003",
    name: "Boxy Cropped Wool Blouson",
    shortDescription: "Cropped architectural blouson cut in dense boiled felted wool with storm flap.",
    description:
      "A tailored short jacket that contrasts an abbreviated torso length with exaggerated sleeve volume. Woven from 100% boiled wool with a rich melange texture, heavy two-way metal zip, and storm tab collar designed to stand erect.",
    category: "outerwear",
    brand: "DRAPE Atelier",
    price: createPrice(84000), // $840.00
    material: "100% Boiled Felted Wool (420 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Do not wash in water",
      "Brush nap with soft garment brush",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for structured cropped blousons.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-09-28T12:00:00Z",
    availableSizes: ["S", "M", "L"],
    availableColors: [
      { name: "Deep Umber", code: "#322521" },
      { name: "Ink Blue", code: "#141E28" },
    ],
    images: [
      {
        id: "img-out-003-1",
        url: "/images/male-model-portrait-with-red-background-stylish-outfit_999859-18885.avif",
        alt: "Boxy Cropped Wool Blouson editorial",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-out-003-2",
        url: "/images/edit-spread-3.jpg",
        alt: "Boxy Cropped Wool Blouson zipper and collar study",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-out-003-umb-s", sku: "DRP-OUT-003-UMB-S", size: "S", color: "Deep Umber", colorCode: "#322521", inStock: true, quantity: 5, isActive: true },
      { id: "var-out-003-umb-m", sku: "DRP-OUT-003-UMB-M", size: "M", color: "Deep Umber", colorCode: "#322521", inStock: true, quantity: 11, isActive: true },
      { id: "var-out-003-umb-l", sku: "DRP-OUT-003-UMB-L", size: "L", color: "Deep Umber", colorCode: "#322521", inStock: true, quantity: 6, isActive: true },
      { id: "var-out-003-ink-m", sku: "DRP-OUT-003-INK-M", size: "M", color: "Ink Blue", colorCode: "#141E28", inStock: true, quantity: 8, isActive: true },
      { id: "var-out-003-ink-l", sku: "DRP-OUT-003-INK-L", size: "L", color: "Ink Blue", colorCode: "#141E28", inStock: true, quantity: 4, isActive: true },
    ],
  },

  // ==========================================
  // DRESSES (2 Products) - 1 Compatible 3D, 1 In Dev
  // ==========================================
  {
    id: "prod-drs-001-column-midi",
    slug: "architectural-column-midi-dress",
    sku: "DRP-DRS-001",
    name: "Architectural Column Midi Dress",
    shortDescription: "Sculptural square-neck column dress with back vent in heavyweight compact crepe.",
    description:
      "A masterclass in modern architectural evening wear. Cast in heavyweight Italian compact crepe with a structured square neckline, straight column silhouette, back vent for graceful stride, and invisible rear zipper closure.",
    category: "dresses",
    brand: "DRAPE Atelier",
    price: createPrice(72000), // $720.00
    material: "74% Acetate, 26% Viscose Compact Crepe (290 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Cool iron with pressing cloth",
      "Do not steam viscose crepe directly",
    ],
    tryOn: {
      available: true,
      garmentId: "dress-midi",
      explanation: "3D virtual try-on mapped to column midi dress pattern with physical drape simulation.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-09-30T10:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Noir", code: "#080808" },
      { name: "Ivory Crepe", code: "#ECEAE4" },
      { name: "Crimson", code: "#4A121A" },
    ],
    images: [
      {
        id: "img-drs-001-1",
        url: "/images/hero-campaign.jpg",
        alt: "Architectural Column Midi Dress campaign look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-drs-001-2",
        url: "/images/campaign-finale.jpg",
        alt: "Architectural Column Midi Dress runway perspective",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-drs-001-noi-xs", sku: "DRP-DRS-001-NOI-XS", size: "XS", color: "Noir", colorCode: "#080808", inStock: true, quantity: 6, isActive: true },
      { id: "var-drs-001-noi-s", sku: "DRP-DRS-001-NOI-S", size: "S", color: "Noir", colorCode: "#080808", inStock: true, quantity: 14, isActive: true },
      { id: "var-drs-001-noi-m", sku: "DRP-DRS-001-NOI-M", size: "M", color: "Noir", colorCode: "#080808", inStock: true, quantity: 12, isActive: true },
      { id: "var-drs-001-noi-l", sku: "DRP-DRS-001-NOI-L", size: "L", color: "Noir", colorCode: "#080808", inStock: true, quantity: 5, isActive: true },
      { id: "var-drs-001-ivo-s", sku: "DRP-DRS-001-IVO-S", size: "S", color: "Ivory Crepe", colorCode: "#ECEAE4", inStock: true, quantity: 8, isActive: true },
      { id: "var-drs-001-ivo-m", sku: "DRP-DRS-001-IVO-M", size: "M", color: "Ivory Crepe", colorCode: "#ECEAE4", inStock: true, quantity: 9, isActive: true },
      { id: "var-drs-001-crm-m", sku: "DRP-DRS-001-CRM-M", size: "M", color: "Crimson", colorCode: "#4A121A", inStock: true, quantity: 4, isActive: true },
    ],
  },
  {
    id: "prod-drs-002-silk-slip",
    slug: "minimalist-silk-slip-dress",
    sku: "DRP-DRS-002",
    name: "Minimalist Silk Slip Dress",
    shortDescription: "Bias-cut 22 Momme silk satin midi dress with delicate rouleau straps.",
    description:
      "A sensual homage to 90s minimalism cut on the bias from substantial 22 Momme Mulberry silk satin. Drapes along the natural curves of the body with fluid ease, finished with ultra-fine rouleau shoulder straps and French internal seams.",
    category: "dresses",
    brand: "DRAPE Atelier",
    price: createPrice(58000), // $580.00
    material: "100% Mulberry Silk Satin (22 Momme)",
    careInstructions: [
      "Specialist dry clean or hand wash cold with silk elixir",
      "Do not wring; dry flat in shade",
      "Steam gently inside out",
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for delicate strap slip silhouettes.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-02T12:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Champagne", code: "#E8DFD3" },
      { name: "Raven Black", code: "#0E0E10" },
    ],
    images: [
      {
        id: "img-drs-002-1",
        url: "/images/street-fashion-beautiful-face-graceful-woman-on-isolated-white-background-portrait-of-female-model-in-studio-lighting-to-shine-through-the-channel-plastic-surgery-and-aesthetic-cosmetology-free-photo.jpg",
        alt: "Minimalist Silk Slip Dress portrait",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-drs-002-2",
        url: "/images/wardrobe-showcase.jpg",
        alt: "Minimalist Silk Slip Dress atelier perspective",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-drs-002-chm-xs", sku: "DRP-DRS-002-CHM-XS", size: "XS", color: "Champagne", colorCode: "#E8DFD3", inStock: true, quantity: 8, isActive: true },
      { id: "var-drs-002-chm-s", sku: "DRP-DRS-002-CHM-S", size: "S", color: "Champagne", colorCode: "#E8DFD3", inStock: true, quantity: 15, isActive: true },
      { id: "var-drs-002-chm-m", sku: "DRP-DRS-002-CHM-M", size: "M", color: "Champagne", colorCode: "#E8DFD3", inStock: true, quantity: 11, isActive: true },
      { id: "var-drs-002-chm-l", sku: "DRP-DRS-002-CHM-L", size: "L", color: "Champagne", colorCode: "#E8DFD3", inStock: true, quantity: 6, isActive: true },
      { id: "var-drs-002-rvn-s", sku: "DRP-DRS-002-RVN-S", size: "S", color: "Raven Black", colorCode: "#0E0E10", inStock: true, quantity: 12, isActive: true },
      { id: "var-drs-002-rvn-m", sku: "DRP-DRS-002-RVN-M", size: "M", color: "Raven Black", colorCode: "#0E0E10", inStock: true, quantity: 10, isActive: true },
    ],
  },

  // ==========================================
  // SKIRTS (2 Products) - 3D Models Available
  // ==========================================
  {
    id: "prod-skt-001-aline-wool",
    slug: "virgin-wool-a-line-skirt",
    sku: "DRP-SKT-001",
    name: "Virgin Wool A-Line Skirt",
    shortDescription: "Structured high-waist A-line silhouette with concealed side fasteners in fine wool twill.",
    description:
      "A structured A-line skirt with an immaculate high-waisted profile and a structured hem flare that holds its shape. Cut from Italian virgin wool twill in Navy, with invisible side closure and a cupro lining for smooth friction-free layering.",
    category: "skirts",
    brand: "DRAPE Atelier",
    price: createPrice(44000), // $440.00
    material: "100% Fine Italian Wool Twill (340 GSM)",
    careInstructions: [
      "Specialist dry clean only",
      "Do not tumble dry",
      "Cool iron under pressing cloth",
    ],
    tryOn: {
      available: true,
      garmentId: "skirt-aline",
      explanation: "3D virtual try-on mapped to high-waist A-line pattern geometry with waist anchoring.",
    },
    featured: true,
    status: "active",
    createdAt: "2026-10-04T14:00:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Navy Twill", code: "#151C24" },
      { name: "Noir", code: "#111111" },
      { name: "Camel", code: "#A88B6E" },
    ],
    images: [
      {
        id: "img-skt-001-1",
        url: "/images/fashion-69822ecb7c423.avif",
        alt: "Virgin Wool A-Line Skirt look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-skt-001-2",
        url: "/images/collection-classics.jpg",
        alt: "Virgin Wool A-Line Skirt fabric texture",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-skt-001-nvy-xs", sku: "DRP-SKT-001-NVY-XS", size: "XS", color: "Navy Twill", colorCode: "#151C24", inStock: true, quantity: 7, isActive: true },
      { id: "var-skt-001-nvy-s", sku: "DRP-SKT-001-NVY-S", size: "S", color: "Navy Twill", colorCode: "#151C24", inStock: true, quantity: 14, isActive: true },
      { id: "var-skt-001-nvy-m", sku: "DRP-SKT-001-NVY-M", size: "M", color: "Navy Twill", colorCode: "#151C24", inStock: true, quantity: 16, isActive: true },
      { id: "var-skt-001-nvy-l", sku: "DRP-SKT-001-NVY-L", size: "L", color: "Navy Twill", colorCode: "#151C24", inStock: true, quantity: 8, isActive: true },
      { id: "var-skt-001-noi-s", sku: "DRP-SKT-001-NOI-S", size: "S", color: "Noir", colorCode: "#111111", inStock: true, quantity: 11, isActive: true },
      { id: "var-skt-001-noi-m", sku: "DRP-SKT-001-NOI-M", size: "M", color: "Noir", colorCode: "#111111", inStock: true, quantity: 12, isActive: true },
      { id: "var-skt-001-cam-m", sku: "DRP-SKT-001-CAM-M", size: "M", color: "Camel", colorCode: "#A88B6E", inStock: true, quantity: 9, isActive: true },
    ],
  },
  {
    id: "prod-skt-002-pleated-midi",
    slug: "sunray-pleated-midi-skirt",
    sku: "DRP-SKT-002",
    name: "Sunray Pleated Midi Skirt",
    shortDescription: "Sharp accordion pleats radiating into fluid movement in champagne satin crepe.",
    description:
      "A dynamic midi skirt featuring heat-set sunray accordion pleats that expand gracefully into fluid kinetic motion. Woven from luminous satin crepe with a structured grosgrain interior waistband and concealed side zip.",
    category: "skirts",
    brand: "DRAPE Atelier",
    price: createPrice(51000), // $510.00
    material: "100% Japanese Satin Crepe (220 GSM)",
    careInstructions: [
      "Specialist dry clean only to maintain pleated geometry",
      "Do not steam pleats directly",
      "Store hanging from interior loops",
    ],
    tryOn: {
      available: true,
      garmentId: "skirt-pleated",
      explanation: "3D virtual try-on mapped to accordion sunray pleated midi mesh.",
    },
    featured: false,
    status: "active",
    createdAt: "2026-10-06T15:30:00Z",
    availableSizes: ["XS", "S", "M", "L"],
    availableColors: [
      { name: "Champagne Satin", code: "#D4C7B8" },
      { name: "Jet Noir", code: "#0F1012" },
      { name: "Bronze Dust", code: "#6F5B4B" },
    ],
    images: [
      {
        id: "img-skt-002-1",
        url: "/images/edit-spread-2.jpg",
        alt: "Sunray Pleated Midi Skirt movement look",
        isPrimary: true,
        displayOrder: 0,
      },
      {
        id: "img-skt-002-2",
        url: "/images/collection-new-season.jpg",
        alt: "Sunray Pleated Midi Skirt pleat texture",
        isPrimary: false,
        displayOrder: 1,
      },
    ],
    variants: [
      { id: "var-skt-002-chm-xs", sku: "DRP-SKT-002-CHM-XS", size: "XS", color: "Champagne Satin", colorCode: "#D4C7B8", inStock: true, quantity: 8, isActive: true },
      { id: "var-skt-002-chm-s", sku: "DRP-SKT-002-CHM-S", size: "S", color: "Champagne Satin", colorCode: "#D4C7B8", inStock: true, quantity: 15, isActive: true },
      { id: "var-skt-002-chm-m", sku: "DRP-SKT-002-CHM-M", size: "M", color: "Champagne Satin", colorCode: "#D4C7B8", inStock: true, quantity: 18, isActive: true },
      { id: "var-skt-002-chm-l", sku: "DRP-SKT-002-CHM-L", size: "L", color: "Champagne Satin", colorCode: "#D4C7B8", inStock: true, quantity: 7, isActive: true },
      { id: "var-skt-002-jet-s", sku: "DRP-SKT-002-JET-S", size: "S", color: "Jet Noir", colorCode: "#0F1012", inStock: true, quantity: 10, isActive: true },
      { id: "var-skt-002-jet-m", sku: "DRP-SKT-002-JET-M", size: "M", color: "Jet Noir", colorCode: "#0F1012", inStock: true, quantity: 14, isActive: true },
      { id: "var-skt-002-brz-m", sku: "DRP-SKT-002-BRZ-M", size: "M", color: "Bronze Dust", colorCode: "#6F5B4B", inStock: true, quantity: 6, isActive: true },
    ],
  },
];
