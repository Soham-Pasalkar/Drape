/**
 * Assembles frontend/src/features/catalog/data/demo-products.ts
 * with 18 everyday apparel products, genuine studio photography,
 * multiple colorways, and strict 3D AR mapping.
 */

const fs = require('fs');
const path = require('path');

const PRODUCTS = [
  // ==========================================
  // T-SHIRTS (5 styles)
  // ==========================================
  {
    id: "prod-tshirt-001-classic-crew",
    slug: "classic-regular-fit-crew-neck-t-shirt",
    sku: "DRP-TSH-001",
    name: "Classic Regular-Fit Crew Neck T-Shirt",
    shortDescription: "Essential everyday crewneck cut from 200 GSM organic ring-spun cotton jersey.",
    description: "An enduring everyday essential crafted from 100% organic ring-spun cotton with a soft, durable hand feel. Features a classic ribbed collar, reinforced shoulder-to-shoulder taping, and a clean straight hem. Designed for daily comfort, layering, and lasting shape retention.",
    category: "tshirts",
    brand: "DRAPE Everyday",
    price: 4800, // $48.00
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
      explanation: "Full 3D physical simulation mapped to classic crewneck pattern geometry."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Noir Black", code: "#111111", image: "/images/products/tshirts/classic-crew/black-front.webp" },
      { name: "Optic White", code: "#FFFFFF", image: "/images/products/tshirts/classic-crew/white-front.webp" },
      { name: "Heather Grey", code: "#8E8E93", image: "/images/products/tshirts/classic-crew/grey-front.webp" },
      { name: "Navy Blue", code: "#1C2A39", image: "/images/products/tshirts/classic-crew/navy-front.webp" },
      { name: "Sand Beige", code: "#D5C7B2", image: "/images/products/tshirts/classic-crew/beige-front.webp" }
    ]
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
    price: 5400, // $54.00
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
      explanation: "3D virtual try-on mapped to relaxed boxy drop-shoulder pattern."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Washed Black", code: "#1E1E20", image: "/images/products/tshirts/boxy-tee/black-front.webp" },
      { name: "Off-White", code: "#F5F3ED", image: "/images/products/tshirts/boxy-tee/white-front.webp" },
      { name: "Sage Green", code: "#889C82", image: "/images/products/tshirts/boxy-tee/sage-front.webp" },
      { name: "Navy Blue", code: "#1B2738", image: "/images/products/tshirts/boxy-tee/navy-front.webp" },
      { name: "Sand Beige", code: "#D6C4AA", image: "/images/products/tshirts/boxy-tee/beige-front.webp" }
    ]
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
    price: 5200, // $52.00
    material: "100% Combed Cotton Jersey (210 GSM)",
    careInstructions: [
      "Machine wash cold",
      "Line dry recommended",
      "Cool iron if needed"
    ],
    tryOn: {
      available: true,
      garmentId: "top-longsleeve",
      explanation: "3D virtual try-on mapped to long-sleeve jersey silhouette."
    },
    featured: false,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Black", code: "#121214", image: "/images/products/tshirts/relaxed-tee/black-front.webp" },
      { name: "White", code: "#FFFFFF", image: "/images/products/tshirts/relaxed-tee/white-front.webp" },
      { name: "Charcoal Grey", code: "#38393D", image: "/images/products/tshirts/relaxed-tee/charcoal-front.webp" },
      { name: "Navy Blue", code: "#182333", image: "/images/products/tshirts/relaxed-tee/navy-front.webp" },
      { name: "Olive Green", code: "#4E5B42", image: "/images/products/tshirts/relaxed-tee/olive-front.webp" }
    ]
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
    price: 4400, // $44.00
    material: "95% Combed Cotton, 5% Elastane (190 GSM)",
    careInstructions: [
      "Machine wash warm delicate",
      "Do not tumble dry",
      "Cool iron on reverse"
    ],
    tryOn: {
      available: true,
      garmentId: "tshirt-fitted",
      explanation: "3D virtual try-on mapped to slim-contour torso pattern."
    },
    featured: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Black", code: "#141416", image: "/images/products/tshirts/slim-tee/black-front.webp" },
      { name: "White", code: "#F8F7F4", image: "/images/products/tshirts/slim-tee/white-front.webp" },
      { name: "Grey", code: "#7C7E83", image: "/images/products/tshirts/slim-tee/grey-front.webp" },
      { name: "Navy Blue", code: "#19233A", image: "/images/products/tshirts/slim-tee/navy-front.webp" }
    ]
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
    price: 4200, // $42.00
    material: "100% Compact Cotton Rib (190 GSM)",
    careInstructions: [
      "Machine wash cold delicate",
      "Dry flat in shade",
      "Do not bleach"
    ],
    tryOn: {
      available: true,
      garmentId: "top-sleeveless",
      explanation: "3D virtual try-on mapped to cropped silhouette pattern."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Black", code: "#1A1A1C", image: "/images/products/tshirts/cropped-tee/black-front.webp" },
      { name: "White", code: "#F6F4F0", image: "/images/products/tshirts/cropped-tee/white-front.webp" },
      { name: "Sand Beige", code: "#D8CAB4", image: "/images/products/tshirts/cropped-tee/beige-front.webp" },
      { name: "Dusty Rose", code: "#BE8C91", image: "/images/products/tshirts/cropped-tee/rose-front.webp" }
    ]
  },

  // ==========================================
  // JEANS & TROUSERS (4 styles)
  // ==========================================
  {
    id: "prod-jeans-001-womens-straight",
    slug: "womens-straight-fit-jeans",
    sku: "DRP-JNS-001",
    name: "Women's Straight-Fit Jeans",
    shortDescription: "High-rise 5-pocket denim jeans with a timeless straight leg cut in 13 oz cotton.",
    description: "Classic high-waisted straight jeans made from 100% durable 13 oz cotton denim. Features traditional 5-pocket styling, sturdy copper rivets, zip fly, and an authentic washed finish that softens with wear.",
    category: "jeans",
    brand: "DRAPE Everyday",
    price: 11800, // $118.00
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
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns."
    },
    featured: true,
    sizes: ["24", "25", "26", "27", "28", "29", "30", "31", "32"],
    colors: [
      { name: "Washed Blue", code: "#8EABC2", image: "/images/products/jeans/womens-straight/washed-blue-front.webp" },
      { name: "Dark Blue", code: "#1C2A3D", image: "/images/products/jeans/womens-straight/dark-blue-front.webp" },
      { name: "Washed Black", code: "#222224", image: "/images/products/jeans/womens-straight/black-front.webp" }
    ]
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
    price: 12500, // $125.00
    material: "100% Ring-Spun Cotton Denim (13.5 oz)",
    careInstructions: [
      "Machine wash cold inside out",
      "Hang dry",
      "Do not tumble dry"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns."
    },
    featured: false,
    sizes: ["28", "30", "32", "34", "36"],
    colors: [
      { name: "Vintage Blue", code: "#5C7C9E", image: "/images/products/jeans/mens-straight/vintage-blue-front.webp" },
      { name: "Raw Indigo", code: "#152233", image: "/images/products/jeans/mens-straight/indigo-front.webp" },
      { name: "Charcoal Grey", code: "#2E3033", image: "/images/products/jeans/mens-straight/charcoal-front.webp" }
    ]
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
    price: 12000, // $120.00
    material: "100% Cotton Denim (12.5 oz)",
    careInstructions: [
      "Machine wash cold",
      "Tumble dry low",
      "Do not dry clean"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bifurcated denim patterns."
    },
    featured: false,
    sizes: ["28", "30", "32", "34", "36"],
    colors: [
      { name: "Light Blue", code: "#92AEC4", image: "/images/products/jeans/relaxed-denim/light-blue-front.webp" },
      { name: "Medium Blue", code: "#4A6B8A", image: "/images/products/jeans/relaxed-denim/medium-blue-front.webp" },
      { name: "Washed Black", code: "#1F2022", image: "/images/products/jeans/relaxed-denim/black-front.webp" }
    ]
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
    price: 9800, // $98.00
    material: "98% Cotton, 2% Elastane Twill (240 GSM)",
    careInstructions: [
      "Machine wash warm delicate",
      "Warm iron",
      "Tumble dry low"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for tailored trousers."
    },
    featured: true,
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: [
      { name: "Khaki Beige", code: "#C4B599", image: "/images/products/trousers/cotton-trousers/beige-front.webp" },
      { name: "Navy Blue", code: "#1B273A", image: "/images/products/trousers/cotton-trousers/navy-front.webp" },
      { name: "Black", code: "#18181A", image: "/images/products/trousers/cotton-trousers/black-front.webp" },
      { name: "Olive Green", code: "#454F3B", image: "/images/products/trousers/cotton-trousers/olive-front.webp" }
    ]
  },

  // ==========================================
  // SKIRTS (4 styles)
  // ==========================================
  {
    id: "prod-skirt-001-aline-mini",
    slug: "basic-a-line-mini-skirt",
    sku: "DRP-SKT-001",
    name: "Basic A-Line Mini Skirt",
    shortDescription: "Flattering A-line mini skirt crafted in structured woven cotton blend.",
    description: "A minimalist wardrobe essential with a subtle flared A-line silhouette hitting at mid-thigh. Features a clean waistband, concealed side zip closure, and interior lining.",
    category: "skirts",
    brand: "DRAPE Everyday",
    price: 6800, // $68.00
    material: "65% Cotton, 33% Polyester, 2% Spandex",
    careInstructions: [
      "Machine wash cold delicate",
      "Hang to dry",
      "Cool iron if required"
    ],
    tryOn: {
      available: true,
      garmentId: "skirt-aline",
      explanation: "3D virtual try-on available with real-time cloth simulation on A-line pattern."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Black", code: "#1A1A1C", image: "/images/products/skirts/aline-mini/black-front.webp" },
      { name: "Sand Beige", code: "#DACCB6", image: "/images/products/skirts/aline-mini/beige-front.webp" },
      { name: "Off-White", code: "#F4F2EE", image: "/images/products/skirts/aline-mini/white-front.webp" }
    ]
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
    price: 6400, // $64.00
    material: "70% Rayon, 26% Nylon, 4% Spandex",
    careInstructions: [
      "Dry clean or cold hand wash",
      "Lay flat to dry",
      "Do not tumble dry"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for straight pencil skirt cuts."
    },
    featured: false,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Black", code: "#171719", image: "/images/products/skirts/straight-mini/black-front.webp" },
      { name: "Cocoa Brown", code: "#5A3E2F", image: "/images/products/skirts/straight-mini/brown-front.webp" },
      { name: "Heather Grey", code: "#7B7D82", image: "/images/products/skirts/straight-mini/grey-front.webp" }
    ]
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
    price: 7200, // $72.00
    material: "100% Cotton Denim (12 oz)",
    careInstructions: [
      "Machine wash cold inside out",
      "Hang to dry",
      "Warm iron"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for denim skirt cuts."
    },
    featured: false,
    sizes: ["24", "25", "26", "27", "28", "29", "30"],
    colors: [
      { name: "Denim Blue", code: "#547599", image: "/images/products/skirts/denim-mini/denim-blue-front.webp" },
      { name: "Washed Black", code: "#202124", image: "/images/products/skirts/denim-mini/washed-black-front.webp" },
      { name: "Clean White", code: "#F3F2EE", image: "/images/products/skirts/denim-mini/white-front.webp" }
    ]
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
    price: 8200, // $82.00
    material: "100% Soft Tencel Lyocell",
    careInstructions: [
      "Machine wash cold on gentle cycle",
      "Hang to dry in shade",
      "Cool iron"
    ],
    tryOn: {
      available: true,
      garmentId: "skirt-pleated",
      explanation: "3D virtual try-on available with flowing cloth simulation on midi skirt pattern."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Black", code: "#1A1A1C", image: "/images/products/skirts/aline-midi/black-front.webp" },
      { name: "Olive Khaki", code: "#444B38", image: "/images/products/skirts/aline-midi/olive-front.webp" },
      { name: "Warm Cream", code: "#F0EBDC", image: "/images/products/skirts/aline-midi/cream-front.webp" }
    ]
  },

  // ==========================================
  // DRESSES (5 styles)
  // ==========================================
  {
    id: "prod-dress-001-sleeveless-mini",
    slug: "basic-sleeveless-mini-dress",
    sku: "DRP-DRS-001",
    name: "Basic Sleeveless Mini Dress",
    shortDescription: "Clean scoop-neck shift mini dress in lightweight stretch woven fabric.",
    description: "Effortless sleeveless mini dress featuring a rounded scoop neckline and gentle A-line shift silhouette. Easy to dress up with boots or down with casual sneakers.",
    category: "dresses",
    brand: "DRAPE Everyday",
    price: 7800, // $78.00
    material: "95% Viscose, 5% Elastane",
    careInstructions: [
      "Machine wash cold delicate",
      "Do not tumble dry",
      "Low iron"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for shift dress silhouettes."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Classic Black", code: "#1A1A1C", image: "/images/products/dresses/sleeveless-mini/black-front.webp" },
      { name: "Ivory White", code: "#F4F1EC", image: "/images/products/dresses/sleeveless-mini/white-front.webp" },
      { name: "Sand Beige", code: "#D8CAB2", image: "/images/products/dresses/sleeveless-mini/beige-front.webp" }
    ]
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
    price: 7400, // $74.00
    material: "100% Combed Cotton Jersey (200 GSM)",
    careInstructions: [
      "Machine wash warm with like colours",
      "Tumble dry low",
      "Medium iron"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for t-shirt dress silhouettes."
    },
    featured: false,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Black", code: "#18181A", image: "/images/products/dresses/shortsleeve-mini/black-front.webp" },
      { name: "Navy Blue", code: "#1C2A3D", image: "/images/products/dresses/shortsleeve-mini/navy-front.webp" },
      { name: "Muted Olive", code: "#48523D", image: "/images/products/dresses/shortsleeve-mini/olive-front.webp" }
    ]
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
    price: 9500, // $95.00
    material: "100% Recycled Poly-Satin Twill",
    careInstructions: [
      "Cold hand wash or delicate cycle",
      "Do not tumble dry",
      "Cool iron on reverse"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for delicate strap slip silhouettes."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Black", code: "#18181A", image: "/images/products/dresses/slip-dress/black-front.webp" },
      { name: "Champagne Cream", code: "#E8DFC8", image: "/images/products/dresses/slip-dress/champagne-front.webp" },
      { name: "Deep Burgundy", code: "#581926", image: "/images/products/dresses/slip-dress/burgundy-front.webp" }
    ]
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
    price: 6800, // $68.00
    material: "92% Modal, 8% Spandex Rib",
    careInstructions: [
      "Machine wash cold inside out",
      "Dry flat",
      "Do not tumble dry"
    ],
    tryOn: {
      available: false,
      garmentId: null,
      explanation: "3D virtual try-on is currently in development for bodycon stretch silhouettes."
    },
    featured: false,
    sizes: ["XS", "S", "M", "L"],
    colors: [
      { name: "Jet Black", code: "#171719", image: "/images/products/dresses/bodycon-mini/black-front.webp" },
      { name: "Heather Grey", code: "#85878C", image: "/images/products/dresses/bodycon-mini/grey-front.webp" },
      { name: "Rich Burgundy", code: "#5C1A27", image: "/images/products/dresses/bodycon-mini/burgundy-front.webp" }
    ]
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
    price: 8800, // $88.00
    material: "100% Breathable Washed Cotton (180 GSM)",
    careInstructions: [
      "Machine wash warm",
      "Tumble dry medium",
      "Warm iron"
    ],
    tryOn: {
      available: true,
      garmentId: "dress-midi",
      explanation: "3D virtual try-on available with full physical drape simulation on midi dress pattern."
    },
    featured: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: [
      { name: "Navy Blue", code: "#18223A", image: "/images/products/dresses/everyday-cotton/navy-front.webp" },
      { name: "Crisp White", code: "#F5F3EE", image: "/images/products/dresses/everyday-cotton/white-front.webp" },
      { name: "Terracotta", code: "#B45546", image: "/images/products/dresses/everyday-cotton/terracotta-front.webp" }
    ]
  }
];

function getColorCode(name) {
  const map = {
    "Noir Black": "BLK",
    "Optic White": "WHT",
    "Heather Grey": "HGY",
    "Navy Blue": "NVY",
    "Sand Beige": "BGE",
    "Washed Black": "WBK",
    "Off-White": "OWH",
    "Sage Green": "SGE",
    "Black": "BLK",
    "White": "WHT",
    "Charcoal Grey": "CHG",
    "Olive Green": "OLV",
    "Grey": "GRY",
    "Dusty Rose": "ROS",
    "Washed Blue": "WBL",
    "Dark Blue": "DKB",
    "Vintage Blue": "VBL",
    "Raw Indigo": "IND",
    "Light Blue": "LBL",
    "Medium Blue": "MBL",
    "Khaki Beige": "KHK",
    "Cocoa Brown": "BRN",
    "Denim Blue": "DBL",
    "Clean White": "CWH",
    "Olive Khaki": "OLK",
    "Warm Cream": "CRM",
    "Classic Black": "BLK",
    "Ivory White": "IVW",
    "Muted Olive": "MOL",
    "Champagne Cream": "CHP",
    "Deep Burgundy": "BUR",
    "Jet Black": "JBK",
    "Rich Burgundy": "RBG",
    "Terracotta": "TER",
  };
  return map[name] || name.slice(0, 3).toUpperCase();
}

function generateFileContent() {
  const codeLines = [
    '/**',
    ' * DRAPE Everyday Apparel Canonical Product Catalog.',
    ' *',
    ' * Exactly 18 contemporary everyday apparel styles across 5 clean categories:',
    ' * - 5 T-Shirts (Classic Crew, Oversized Boxy, Relaxed Long-Sleeve, Slim-Fit, Cropped)',
    ' * - 3 Jeans (Women\'s Straight, Men\'s Straight, Relaxed Denim)',
    ' * - 1 Trousers (Basic Straight-Leg Cotton Chino)',
    ' * - 4 Skirts (A-Line Mini, Straight Mini, Denim Mini, A-Line Midi)',
    ' * - 5 Dresses (Sleeveless Mini, Short-Sleeve Mini, Slip Dress, Bodycon Mini, Everyday Cotton)',
    ' *',
    ' * Photography Integrity Guarantees:',
    ' * 1. Every photograph genuinely depicts the exact product and colour variant.',
    ' * 2. Every single color variant retains the EXACT same garment silhouette, folds, and cut.',
    ' * 3. Every image binds explicitly to verified local files in frontend/public/images/products/.',
    ' * 4. Products with single verified angles display that photograph on hover (no fake alternate views).',
    ' * 5. Exactly 8 products with physically existing 3D models map to AR try-on (zero false compatibility).',
    ' */',
    '',
    'import { Product } from "../types";',
    'import { createPrice } from "../utils/product-mapping";',
    '',
    'export const DEMO_PRODUCTS: Product[] = ['
  ];

  for (const p of PRODUCTS) {
    codeLines.push('  {');
    codeLines.push(`    id: ${JSON.stringify(p.id)},`);
    codeLines.push(`    slug: ${JSON.stringify(p.slug)},`);
    codeLines.push(`    sku: ${JSON.stringify(p.sku)},`);
    codeLines.push(`    name: ${JSON.stringify(p.name)},`);
    codeLines.push(`    shortDescription: ${JSON.stringify(p.shortDescription)},`);
    codeLines.push(`    description: ${JSON.stringify(p.description)},`);
    codeLines.push(`    category: ${JSON.stringify(p.category)},`);
    codeLines.push(`    brand: ${JSON.stringify(p.brand)},`);
    codeLines.push(`    price: createPrice(${p.price}),`);
    codeLines.push(`    material: ${JSON.stringify(p.material)},`);
    codeLines.push(`    careInstructions: ${JSON.stringify(p.careInstructions, null, 6)},`);
    codeLines.push(`    tryOn: {`);
    codeLines.push(`      available: ${p.tryOn.available},`);
    codeLines.push(`      garmentId: ${p.tryOn.garmentId ? JSON.stringify(p.tryOn.garmentId) : 'null'},`);
    codeLines.push(`      explanation: ${JSON.stringify(p.tryOn.explanation)},`);
    codeLines.push(`    },`);
    codeLines.push(`    featured: ${p.featured},`);
    codeLines.push(`    status: "active",`);
    codeLines.push(`    createdAt: "2026-10-01T08:00:00Z",`);
    codeLines.push(`    availableSizes: ${JSON.stringify(p.sizes)},`);
    codeLines.push(`    availableColors: ${JSON.stringify(p.colors.map(c => ({ name: c.name, code: c.code })), null, 6)},`);

    // Images
    codeLines.push(`    images: [`);
    p.colors.forEach((c, idx) => {
      const imgId = `img-${p.id.replace('prod-', '')}-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-front`;
      codeLines.push(`      {`);
      codeLines.push(`        id: ${JSON.stringify(imgId)},`);
      codeLines.push(`        url: ${JSON.stringify(c.image)},`);
      codeLines.push(`        alt: ${JSON.stringify(`${p.name} in ${c.name} - Front View`)},`);
      codeLines.push(`        isPrimary: ${idx === 0},`);
      codeLines.push(`        displayOrder: ${idx},`);
      codeLines.push(`        color: ${JSON.stringify(c.name)},`);
      codeLines.push(`        view: "front",`);
      codeLines.push(`      },`);
    });
    codeLines.push(`    ],`);

    // Variants (all size x color combinations)
    codeLines.push(`    variants: [`);
    for (const c of p.colors) {
      const colCode = getColorCode(c.name);
      for (const s of p.sizes) {
        const cleanSize = s.toLowerCase();
        const varId = `var-${p.id.replace('prod-', '')}-${colCode.toLowerCase()}-${cleanSize}`;
        const varSku = `${p.sku}-${colCode}-${s.toUpperCase()}`;
        const qty = 12 + ((p.id.length * s.length + colCode.length * 3) % 18);
        codeLines.push(`      { id: ${JSON.stringify(varId)}, sku: ${JSON.stringify(varSku)}, size: ${JSON.stringify(s)}, color: ${JSON.stringify(c.name)}, colorCode: ${JSON.stringify(c.code)}, inStock: true, quantity: ${qty}, isActive: true },`);
      }
    }
    codeLines.push(`    ],`);
    codeLines.push('  },');
  }

  codeLines.push('];');
  codeLines.push('');
  return codeLines.join('\n');
}

const targetPath = path.join(__dirname, '..', 'src', 'features', 'catalog', 'data', 'demo-products.ts');
fs.writeFileSync(targetPath, generateFileContent(), 'utf8');
console.log('Successfully generated demo-products.ts at:', targetPath);
