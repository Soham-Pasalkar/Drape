"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Cart,
  CartItem,
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  mergeGuestCart as apiMergeGuestCart,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { catalogService } from "@/features/catalog/services/catalog-service";

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  subtotal: number;
  addToBag: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  changeVariant: (itemId: string, variantId: string) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_TOKEN_KEY = "drape_guest_token";
const GUEST_CART_STORAGE_KEY = "drape_guest_cart_data";

function generateCryptoGuestToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `gst_${hex}`;
  }
  return `gst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}`;
}

function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = generateCryptoGuestToken();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
    document.cookie = `${GUEST_TOKEN_KEY}=${token}; path=/; max-age=2592000; SameSite=Lax`;
  }
  return token;
}

function loadLocalCart(token: string): Cart {
  if (typeof window === "undefined") {
    return {
      id: `cart_${token || "anonymous"}`,
      guest_token: token,
      items: [],
      total_items: 0,
      subtotal: 0,
      currency: "USD",
    };
  }

  try {
    const saved = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (saved) {
      const parsed: Cart = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to parse cached local cart:", e);
  }

  return {
    id: `cart_${token || "anonymous"}`,
    guest_token: token,
    items: [],
    total_items: 0,
    subtotal: 0,
    currency: "USD",
  };
}

function saveLocalCart(cart: Cart) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed to save local cart to storage:", e);
    }
  }
}

/**
 * Calculates cart totals using integer arithmetic to prevent floating point inaccuracies.
 */
function recalculateCartTotals(cart: Cart): Cart {
  let totalCents = 0;
  let totalCount = 0;

  for (const item of cart.items) {
    const itemPriceCents = Math.round(item.unit_price * 100);
    const lineTotalCents = itemPriceCents * item.quantity;
    item.line_total = lineTotalCents / 100;
    totalCents += lineTotalCents;
    totalCount += item.quantity;
  }

  return {
    ...cart,
    total_items: totalCount,
    subtotal: totalCents / 100,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string>("");

  // Initialize guest token on mount
  useEffect(() => {
    const token = getOrCreateGuestToken();
    setGuestToken(token);
  }, []);

  const loadCart = useCallback(async () => {
    const token = guestToken || getOrCreateGuestToken();
    try {
      setIsLoading(true);
      setError(null);
      const currentCart = await fetchCart(token, accessToken);
      setCart(currentCart);
      saveLocalCart(currentCart);
      if (currentCart.guest_token) {
        setGuestToken(currentCart.guest_token);
        if (typeof window !== "undefined") {
          localStorage.setItem(GUEST_TOKEN_KEY, currentCart.guest_token);
        }
      }
    } catch {
      // Backend is unavailable or running in standalone frontend mode:
      // Fallback seamlessly to local guest cart without crashing.
      const fallbackCart = loadLocalCart(token);
      setCart(fallbackCart);
    } finally {
      setIsLoading(false);
    }
  }, [guestToken, accessToken]);

  // Initial load
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Merge guest cart on login
  useEffect(() => {
    if (user && accessToken && guestToken) {
      apiMergeGuestCart(guestToken, accessToken)
        .then((merged) => {
          setCart(merged);
          saveLocalCart(merged);
        })
        .catch((err) => {
          console.error("Cart merge error:", err);
        });
    }
  }, [user, accessToken, guestToken]);

  const addToBag = async (variantId: string, quantity = 1) => {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than zero.");
    }

    setError(null);
    const token = guestToken || getOrCreateGuestToken();

    try {
      // 1. Attempt backend authoritative cart endpoint
      const updatedCart = await apiAddToCart(variantId, quantity, token, accessToken);
      setCart(updatedCart);
      saveLocalCart(updatedCart);
      return;
    } catch {
      // 2. Fallback to client-side authoritative calculation from canonical catalog
      let currentCart = cart ? { ...cart, items: [...cart.items] } : loadLocalCart(token);

      // Lookup variant and product in canonical catalog
      let foundProduct: ReturnType<typeof catalogService.getAllProducts>[0] | undefined;
      let foundVariant: ReturnType<typeof catalogService.getAllProducts>[0]["variants"][0] | undefined;

      for (const prod of catalogService.getAllProducts()) {
        const v = prod.variants.find((item) => item.id === variantId || item.sku === variantId);
        if (v) {
          foundProduct = prod;
          foundVariant = v;
          break;
        }
      }

      if (!foundProduct || !foundVariant) {
        throw new Error("The selected garment variant is not found in the atelier archive.");
      }

      const existingIndex = currentCart.items.findIndex((item) => item.variant_id === foundVariant?.id);

      if (existingIndex >= 0) {
        currentCart.items[existingIndex].quantity += quantity;
      } else {
        const newItem: CartItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          variant_id: foundVariant.id,
          product_id: foundProduct.id,
          product_name: foundProduct.name,
          product_slug: foundProduct.slug,
          sku: foundVariant.sku,
          size: foundVariant.size,
          color: foundVariant.color,
          color_code: foundVariant.colorCode,
          unit_price: foundProduct.price.amount,
          currency: "USD",
          quantity,
          line_total: foundProduct.price.amount * quantity,
          primary_image: foundProduct.images[0]?.url || "/images/collection-essentials.jpg",
          available_quantity: foundVariant.quantity,
          in_stock: foundVariant.inStock,
        };
        currentCart.items.push(newItem);
      }

      currentCart = recalculateCartTotals(currentCart);
      setCart(currentCart);
      saveLocalCart(currentCart);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    setError(null);
    const token = guestToken || getOrCreateGuestToken();

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      const updatedCart = await apiUpdateCartItem(
        itemId,
        { quantity },
        token,
        accessToken
      );
      setCart(updatedCart);
      saveLocalCart(updatedCart);
    } catch {
      if (!cart) return;
      let currentCart = { ...cart, items: cart.items.map((it) => ({ ...it })) };
      const item = currentCart.items.find((it) => it.id === itemId);
      if (item) {
        item.quantity = quantity;
        currentCart = recalculateCartTotals(currentCart);
        setCart(currentCart);
        saveLocalCart(currentCart);
      }
    }
  };

  const changeVariant = async (itemId: string, variantId: string) => {
    setError(null);
    const token = guestToken || getOrCreateGuestToken();

    try {
      const updatedCart = await apiUpdateCartItem(
        itemId,
        { variant_id: variantId },
        token,
        accessToken
      );
      setCart(updatedCart);
      saveLocalCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update item variant";
      setError(msg);
      throw err;
    }
  };

  const removeItem = async (itemId: string) => {
    setError(null);
    const token = guestToken || getOrCreateGuestToken();

    try {
      const updatedCart = await apiRemoveCartItem(itemId, token, accessToken);
      setCart(updatedCart);
      saveLocalCart(updatedCart);
    } catch {
      if (!cart) return;
      let currentCart = {
        ...cart,
        items: cart.items.filter((it) => it.id !== itemId).map((it) => ({ ...it })),
      };
      currentCart = recalculateCartTotals(currentCart);
      setCart(currentCart);
      saveLocalCart(currentCart);
    }
  };

  const totalItems = cart?.total_items || 0;
  const subtotal = cart?.subtotal || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        error,
        totalItems,
        subtotal,
        addToBag,
        updateQuantity,
        changeVariant,
        removeItem,
        refreshCart: loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
