"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { catalogService } from "@/features/catalog/services/catalog-service";
import { Product, ProductVariant } from "@/features/catalog/types";
import { useCart } from "@/context/CartContext";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInformation from "@/components/product/ProductInformation";
import VariantSelector from "@/components/product/VariantSelector";
import SizeSelector from "@/components/product/SizeSelector";
import AddToBagButton from "@/components/product/AddToBagButton";
import ProductTryOnButton from "@/components/product/ProductTryOnButton";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string) || "";

  const { addToBag } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Load canonical product by slug
  useEffect(() => {
    if (!slug) return;
    const found = catalogService.getProductBySlug(slug);
    if (found) {
      setProduct(found);
      // Default to first color
      if (found.availableColors.length > 0) {
        setSelectedColor(found.availableColors[0].name);
      }
    } else {
      setProduct(null);
    }
  }, [slug]);

  // Derived in-stock sizes for currently selected color
  const inStockSizesForColor = useMemo(() => {
    if (!product || !selectedColor) return [];
    return product.variants
      .filter(
        (v) =>
          v.color.toLowerCase() === selectedColor.toLowerCase() &&
          v.inStock &&
          v.isActive
      )
      .map((v) => v.size);
  }, [product, selectedColor]);

  // Active chosen variant matching selected color & size
  const activeVariant: ProductVariant | undefined = useMemo(() => {
    if (!product || !selectedColor || !selectedSize) return undefined;
    return product.variants.find(
      (v) =>
        v.color.toLowerCase() === selectedColor.toLowerCase() &&
        v.size.toUpperCase() === selectedSize.toUpperCase()
    );
  }, [product, selectedColor, selectedSize]);

  // Handle Add to Bag
  const handleAddToBag = async () => {
    setSizeError(null);
    setAddError(null);

    if (!selectedSize) {
      setSizeError("Please select a size to add this piece to your bag.");
      return;
    }

    if (!activeVariant) {
      setSizeError("The selected configuration is currently unavailable.");
      return;
    }

    try {
      setIsAdding(true);
      await addToBag(activeVariant.id, 1);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3500);
    } catch (err: unknown) {
      console.error("Add to bag error:", err);
      setAddError(
        err instanceof Error
          ? err.message
          : "Failed to reserve garment in shopping bag."
      );
    } finally {
      setIsAdding(false);
    }
  };

  // Not Found State
  if (!product) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center px-4">
        <h1 className="font-serif text-3xl sm:text-4xl text-ink-black mb-3">
          Garment Not Found in Archive
        </h1>
        <p className="font-sans text-xs text-ink-black/60 max-w-md mx-auto mb-8 leading-relaxed">
          The requested edition does not exist in the current collection or may have been retired.
        </p>
        <Link
          href="/collections"
          className="inline-flex items-center space-x-2 px-8 py-4 bg-ink-black text-warm-ivory text-xs font-mono tracking-widest uppercase hover:bg-electric-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Collections</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-warm-ivory min-h-screen text-ink-black py-8 sm:py-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-2 text-[10px] font-mono uppercase tracking-widest text-ink-black/50 mb-8"
        >
          <Link href="/" className="hover:text-ink-black transition-colors">
            Atelier
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <Link href="/collections" className="hover:text-ink-black transition-colors">
            Collections
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <Link
            href={`/collections/${product.category}`}
            className="hover:text-ink-black transition-colors"
          >
            {product.category}
          </Link>
          <ChevronRight className="w-3 h-3 text-ink-black/30" />
          <span className="text-ink-black font-semibold truncate max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Product Details Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Gallery */}
          <div className="lg:col-span-7">
            <ProductGallery
              images={product.images}
              productName={product.name}
              isTryOnCompatible={product.tryOn.available}
              selectedColor={selectedColor}
            />
          </div>

          {/* Right Column: Information, Selectors & Actions */}
          <div className="lg:col-span-5 space-y-8">
            <ProductInformation product={product} />

            {/* Color Swatch Selector */}
            <VariantSelector
              colors={product.availableColors}
              selectedColor={selectedColor}
              onSelectColor={(colorName) => {
                setSelectedColor(colorName);
                setSizeError(null);
              }}
            />

            {/* Size Selector */}
            <SizeSelector
              availableSizes={product.availableSizes}
              selectedSize={selectedSize}
              onSelectSize={(sz) => {
                setSelectedSize(sz);
                setSizeError(null);
              }}
              inStockSizes={inStockSizesForColor}
              validationError={sizeError}
            />

            {/* Add to Bag Action */}
            <AddToBagButton
              onAdd={handleAddToBag}
              isLoading={isAdding}
              isSuccess={addedSuccess}
              error={addError}
              sku={activeVariant?.sku}
            />

            {/* 3D Try-On Launch / Explanation Banner */}
            <ProductTryOnButton product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
