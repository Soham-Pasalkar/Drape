"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Cart,
  fetchCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  mergeGuestCart as apiMergeGuestCart,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
    try {
      setIsLoading(true);
      setError(null);
      const token = guestToken || getOrCreateGuestToken();
      const currentCart = await fetchCart(token, accessToken);
      setCart(currentCart);
      if (currentCart.guest_token) {
        setGuestToken(currentCart.guest_token);
        if (typeof window !== "undefined") {
          localStorage.setItem(GUEST_TOKEN_KEY, currentCart.guest_token);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load shopping cart:", err);
      setError(err instanceof Error ? err.message : "Failed to load shopping bag");
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
        })
        .catch((err) => {
          console.error("Cart merge error:", err);
        });
    }
  }, [user, accessToken, guestToken]);

  const addToBag = async (variantId: string, quantity = 1) => {
    try {
      setError(null);
      const token = guestToken || getOrCreateGuestToken();
      const updatedCart = await apiAddToCart(variantId, quantity, token, accessToken);
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add to bag";
      setError(msg);
      throw err;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      setError(null);
      const token = guestToken || getOrCreateGuestToken();
      const updatedCart = await apiUpdateCartItem(
        itemId,
        { quantity },
        token,
        accessToken
      );
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update quantity";
      setError(msg);
      throw err;
    }
  };

  const changeVariant = async (itemId: string, variantId: string) => {
    try {
      setError(null);
      const token = guestToken || getOrCreateGuestToken();
      const updatedCart = await apiUpdateCartItem(
        itemId,
        { variant_id: variantId },
        token,
        accessToken
      );
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update item variant";
      setError(msg);
      throw err;
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      setError(null);
      const token = guestToken || getOrCreateGuestToken();
      const updatedCart = await apiRemoveCartItem(itemId, token, accessToken);
      setCart(updatedCart);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove item";
      setError(msg);
      throw err;
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

