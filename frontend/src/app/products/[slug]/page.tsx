"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Sparkles,
  Check,
  ChevronRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Plus,
  Minus,
  X,
  AlertCircle,
  Eye,
  Camera,
} from "lucide-react";
import { ProductDetail, ProductVariant, fetchProduct } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const { addToBag } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [arModalOpen, setArModalOpen] = useState<boolean>(false);

  // Accordion state
  const [openSection, setOpenSection] = useState<string | null>("specifications");

  // Fetch product detail
  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setError(null);
    fetchProduct(slug)
      .then((data) => {
        setProduct(data);
        if (data.variants && data.variants.length > 0) {
          // Find first active in-stock variant if available
          const firstInStock = data.variants.find((v) => v.in_stock && v.is_active);
          const defaultVariant = firstInStock || data.variants[0];
          setSelectedColor(defaultVariant.color);
          setSelectedSize(defaultVariant.size);
        }
      })
      .catch((err) => {
        console.error("Failed to load product:", err);
        setError(err instanceof Error ? err.message : "Garment not found in archive.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  // Derived available colors
  const availableColors = useMemo(() => {
    if (!product) return [];
    const map = new Map<string, string | null>();
    product.variants.forEach((v) => {
      if (!map.has(v.color)) {
        map.set(v.color, v.color_code);
      }
    });
    return Array.from(map.entries()).map(([color, code]) => ({ color, code }));
  }, [product]);

  // Filter sizes based on active color
  const colorVariants = useMemo(() => {
    if (!product || !selectedColor) return [];
    return product.variants.filter((v) => v.color === selectedColor);
  }, [product, selectedColor]);

  // Active chosen variant
  const activeVariant: ProductVariant | undefined = useMemo(() => {
    if (!product) return undefined;
    return product.variants.find(
      (v) => v.color === selectedColor && v.size === selectedSize
    );
  }, [product, selectedColor, selectedSize]);

  // Map product to matching 3D calibrated rig
  const matchingGarmentId = useMemo(() => {
    if (!product) return "tshirt-crewneck";
    const cat = product.category?.toLowerCase() || "";
    const name = product.name?.toLowerCase() || "";
    if (cat.includes("dress") || name.includes("dress") || name.includes("gown")) return "dress-midi";
    if (cat.includes("skirt") || name.includes("skirt") || name.includes("pleat")) return "skirt-pleated";
    if (name.includes("fitted") || name.includes("ribbed")) return "tshirt-fitted";
    if (name.includes("oversized") || name.includes("heavyweight")) return "tshirt-oversized";
    if (name.includes("cashmere") || name.includes("long-sleeve")) return "top-longsleeve";
    if (name.includes("silk") || name.includes("halter") || name.includes("sleeveless")) return "top-sleeveless";
    return "tshirt-crewneck";
  }, [product]);

  // Handle Add To Bag
  const handleAddToBag = async () => {
    if (!activeVariant) return;
    try {
      setIsAdding(true);
      setError(null);
      await addToBag(activeVariant.id, quantity);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add garment to bag.");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Loading Atelier Dossier...
        </p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center px-4">
        <h1 className="font-serif text-3xl text-ink-black mb-3">Garment Not Found</h1>
        <p className="font-sans text-xs text-ink-black/60 max-w-md mx-auto mb-6">
          This piece may have been retired from the active atelier collection or relocated in the archive.
        </p>
        <Link
          href="/collections"
          className="inline-block px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono tracking-widest uppercase hover:bg-electric-blue transition-colors"
        >
          Return to Collections
        </Link>
      </div>
    );
  }

  if (!product) return null;

  const currentImages = product.images && product.images.length > 0
    ? product.images
    : [{ id: "fallback", image_url: "/images/collection-essentials.jpg", alt_text: product.name, display_order: 0, is_primary: true }];
  const activeImage = currentImages[selectedImageIndex] || currentImages[0];

  const stockQuantity = activeVariant?.available_quantity || 0;
  const isOutOfStock = !activeVariant || !activeVariant.in_stock || stockQuantity === 0;

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-8 lg:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-[10px] font-mono tracking-widest uppercase text-ink-black/50 mb-8 overflow-x-auto">
          <Link href="/" className="hover:text-electric-blue transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <Link href="/collections" className="hover:text-electric-blue transition-colors">
            Collections
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <Link
            href={`/collections/${product.category.toLowerCase()}`}
            className="hover:text-electric-blue transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <span className="text-ink-black font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Product Dual-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 space-y-4">
            {/* Primary Main Image */}
            <div className="relative aspect-[3/4] bg-ink-black/5 overflow-hidden border border-ink-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImage.image_url}
                alt={activeImage.alt_text || product.name}
                className="w-full h-full object-cover object-center"
              />

              {/* Status Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.featured && (
                  <span className="bg-ink-black text-warm-ivory text-[9px] font-mono tracking-widest uppercase px-2.5 py-1">
                    ATELIER PLATE EDITION
                  </span>
                )}
                {product.try_on_enabled && (
                  <span className="bg-electric-blue text-white text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 flex items-center space-x-1.5 shadow-sm">
                    <Sparkles className="w-3 h-3" />
                    <span>3D NEURAL DRAPE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail Strip (if multiple images) */}
            {currentImages.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                {currentImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative w-20 h-24 border overflow-hidden transition-all flex-shrink-0 ${
                      selectedImageIndex === idx
                        ? "border-electric-blue ring-1 ring-electric-blue"
                        : "border-ink-black/20 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt={img.alt_text || `Angle ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Garment Specifications & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-start space-y-7">
            {/* Header / Brand & Title */}
            <div className="border-b border-ink-black/10 pb-6">
              <div className="flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-ink-black/60 mb-2">
                <span>{product.brand}</span>
                <span>{product.category}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-ink-black mb-3">
                {product.name}
              </h1>
              <div className="flex items-baseline space-x-3">
                <span className="font-mono text-2xl font-normal text-ink-black">
                  ${product.price.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
                <span className="font-mono text-xs text-ink-black/50">
                  {product.currency} • COMPLIMENTARY ATELIER SHIPPING
                </span>
              </div>
            </div>

            {/* Brief Description */}
            <p className="font-sans text-xs sm:text-sm text-ink-black/80 leading-relaxed">
              {product.description}
            </p>

            {/* Color Selector */}
            {availableColors.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="tracking-widest uppercase text-ink-black/60 text-[10px]">
                    SELECT COLOUR:
                  </span>
                  <span className="font-medium text-ink-black capitalize">
                    {selectedColor}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  {availableColors.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => {
                        setSelectedColor(c.color);
                        // Update size if active size is unavailable in new color
                        const matching = product.variants.find(
                          (v) => v.color === c.color && v.size === selectedSize
                        );
                        if (!matching) {
                          const firstInNewColor = product.variants.find(
                            (v) => v.color === c.color && v.in_stock
                          ) || product.variants.find((v) => v.color === c.color);
                          if (firstInNewColor) setSelectedSize(firstInNewColor.size);
                        }
                      }}
                      className={`relative w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                        selectedColor === c.color
                          ? "border-electric-blue scale-110 shadow-sm"
                          : "border-ink-black/20 hover:border-ink-black/50"
                      }`}
                      style={{ backgroundColor: c.code || "#222" }}
                      title={c.color}
                    >
                      {selectedColor === c.color && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector with Live Inventory */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="tracking-widest uppercase text-ink-black/60 text-[10px]">
                  SELECT SIZE:
                </span>
                {activeVariant && (
                  <span
                    className={`text-[10px] uppercase font-mono tracking-wider ${
                      isOutOfStock
                        ? "text-red-600"
                        : stockQuantity <= 3
                        ? "text-amber-600"
                        : "text-emerald-700"
                    }`}
                  >
                    {isOutOfStock
                      ? "Sold Out in Selected Configuration"
                      : stockQuantity <= 3
                      ? `Only ${stockQuantity} pieces remaining`
                      : "In Stock • Immediate Dispatch"}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2 font-mono text-xs">
                {colorVariants.map((v) => {
                  const isSelected = selectedSize === v.size;
                  const isAvailable = v.in_stock && v.available_quantity > 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedSize(v.size)}
                      className={`py-3 text-center border transition-all ${
                        isSelected
                          ? "bg-ink-black text-warm-ivory border-ink-black font-medium"
                          : isAvailable
                          ? "border-ink-black/20 text-ink-black hover:border-ink-black"
                          : "border-ink-black/10 text-ink-black/30 bg-ink-black/5 cursor-not-allowed line-through"
                      }`}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity Stepper */}
            {!isOutOfStock && stockQuantity > 1 && (
              <div className="flex items-center space-x-4 pt-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-black/60">
                  QUANTITY:
                </span>
                <div className="flex items-center border border-ink-black/20 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="p-2 hover:bg-ink-black/5 disabled:opacity-30 transition-colors"
                  >
                    <Minus className="w-3 h-3 text-ink-black" />
                  </button>
                  <span className="font-mono text-xs w-8 text-center font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))}
                    disabled={quantity >= Math.min(stockQuantity, 10)}
                    className="p-2 hover:bg-ink-black/5 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-ink-black" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-4 border-t border-ink-black/10">
              <button
                onClick={handleAddToBag}
                disabled={isOutOfStock || isAdding}
                className={`w-full py-4 text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center space-x-2 ${
                  addedSuccess
                    ? "bg-emerald-700 text-white"
                    : isOutOfStock
                    ? "bg-ink-black/20 text-ink-black/40 cursor-not-allowed"
                    : "bg-ink-black text-warm-ivory hover:bg-electric-blue"
                }`}
              >
                {addedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Atelier Bag</span>
                  </>
                ) : isAdding ? (
                  <span>Reserving Garment...</span>
                ) : isOutOfStock ? (
                  <span>Selected Size Sold Out</span>
                ) : (
                  <span>Add to Atelier Bag</span>
                )}
              </button>

              {/* Try in 3D AR CTA */}
              <Link
                href={`/try-on?garment=${matchingGarmentId}`}
                className="w-full py-3.5 border border-ink-black/30 bg-transparent text-ink-black hover:border-electric-blue hover:text-electric-blue text-xs font-mono uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4 text-electric-blue" />
                <span>Try On in 3D AR Studio</span>
              </Link>
            </div>

            {/* Luxury Service Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-ink-black/10 text-[10px] font-mono text-ink-black/70">
              <div className="flex flex-col items-center text-center p-2 bg-ink-black/5 rounded-sm">
                <Truck className="w-4 h-4 mb-1 text-ink-black/60" />
                <span>White-Glove Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 bg-ink-black/5 rounded-sm">
                <RotateCcw className="w-4 h-4 mb-1 text-ink-black/60" />
                <span>14-Day Atelier Returns</span>
              </div>
              <div className="flex flex-col items-center text-center p-2 bg-ink-black/5 rounded-sm">
                <ShieldCheck className="w-4 h-4 mb-1 text-ink-black/60" />
                <span>Verified Provenance</span>
              </div>
            </div>

            {/* Editorial Accordion */}
            <div className="border-t border-ink-black/15 pt-4 space-y-3 font-sans text-xs">
              {/* Specification */}
              <div className="border-b border-ink-black/10 pb-3">
                <button
                  onClick={() =>
                    setOpenSection(openSection === "specifications" ? null : "specifications")
                  }
                  className="w-full flex items-center justify-between font-mono text-[11px] uppercase tracking-wider py-1 text-left text-ink-black"
                >
                  <span>Garment Specifications & Material</span>
                  <span>{openSection === "specifications" ? "—" : "+"}</span>
                </button>
                {openSection === "specifications" && (
                  <div className="mt-2 text-ink-black/75 space-y-1.5 leading-relaxed">
                    <p><strong>Material:</strong> {product.material || "Sensory Virgin Wool blend"}</p>
                    <p><strong>SKU:</strong> {activeVariant?.sku || "DRAPE-ATELIER"}</p>
                    <p><strong>Origin:</strong> Hand-crafted in Biella, Italy</p>
                  </div>
                )}
              </div>

              {/* Care Instructions */}
              <div className="border-b border-ink-black/10 pb-3">
                <button
                  onClick={() => setOpenSection(openSection === "care" ? null : "care")}
                  className="w-full flex items-center justify-between font-mono text-[11px] uppercase tracking-wider py-1 text-left text-ink-black"
                >
                  <span>Atelier Care & Permanence</span>
                  <span>{openSection === "care" ? "—" : "+"}</span>
                </button>
                {openSection === "care" && (
                  <div className="mt-2 text-ink-black/75 leading-relaxed">
                    {product.care_instructions ||
                      "Specialist dry clean only. Store on structured cedar hanger with breathable garment protector."}
                  </div>
                )}
              </div>

              {/* Shipping & Delivery */}
              <div className="border-b border-ink-black/10 pb-3">
                <button
                  onClick={() => setOpenSection(openSection === "shipping" ? null : "shipping")}
                  className="w-full flex items-center justify-between font-mono text-[11px] uppercase tracking-wider py-1 text-left text-ink-black"
                >
                  <span>Atelier Delivery & Provenance</span>
                  <span>{openSection === "shipping" ? "—" : "+"}</span>
                </button>
                {openSection === "shipping" && (
                  <div className="mt-2 text-ink-black/75 leading-relaxed space-y-1">
                    <p>Complimentary insured courier delivery across North America, Europe, and Asia.</p>
                    <p>Each piece is dispatched in tailored archival packaging with authenticated certification of origin.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Try In AR (Coming Soon) Luxury Modal */}
      {arModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-warm-ivory border border-ink-black/20 max-w-lg w-full p-6 sm:p-8 relative shadow-2xl">
            <button
              onClick={() => setArModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-ink-black/60 hover:text-ink-black"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 text-electric-blue mb-3">
              <Sparkles className="w-5 h-5" />
              <span className="font-mono text-xs tracking-widest uppercase font-medium">
                DRAPE SPATIAL ATELIER • MILESTONE 3 PREVIEW
              </span>
            </div>

            <h3 className="font-serif text-2xl font-normal text-ink-black mb-3">
              Real-Time Neural Drape Simulation
            </h3>

            <p className="font-sans text-xs sm:text-sm text-ink-black/75 leading-relaxed mb-6">
              Our real-time 3D camera drape studio is undergoing sensory physics calibration.
              In Milestone 3, you will be able to activate your camera or upload a portrait to
              witness this garment drape against your body with genuine textile weight, stretch, and flow.
            </p>

            {/* Technical Readiness Specification */}
            <div className="bg-white/80 border border-ink-black/10 p-4 rounded-sm space-y-2 mb-6 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-ink-black/60">PIECE:</span>
                <span className="font-medium text-ink-black truncate max-w-[240px]">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-black/60">3D MODEL STATUS:</span>
                <span className="text-emerald-700 font-medium uppercase">
                  {product.model_3d_status === "ready" ? "Calibrated (GLB/USDZ)" : "Pending Pipeline"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-black/60">SPATIAL FORMAT:</span>
                <span className="text-ink-black">{product.model_3d_format || "GLB / USDZ compatible"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-black/60">PHYSICS RIG:</span>
                <span className="text-ink-black">Finite-Element Cloth Mechanics</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/try-on?garment=${matchingGarmentId}`}
                className="flex-1 py-3 bg-electric-blue text-white text-xs font-mono uppercase tracking-widest hover:bg-electric-blue/90 text-center transition-colors flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch 3D AR Try-On</span>
              </Link>
              <button
                onClick={() => setArModalOpen(false)}
                className="py-3 px-6 border border-ink-black/30 text-center text-xs font-mono uppercase tracking-widest text-ink-black hover:border-ink-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

