"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  ChevronRight,
  Lock,
  CreditCard,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  Address,
  AddressCreatePayload,
  CheckoutQuote,
  ShippingOption,
  getAddresses,
  createAddress,
  getCheckoutQuote,
  createCheckoutOrder,
  createRazorpayPaymentSession,
  verifyRazorpayPayment,
} from "@/lib/api";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, refreshCart } = useCart();
  const { user, accessToken } = useAuth();
  const isAuthenticated = !!user;

  // Step state: 1: Info & Address, 2: Shipping, 3: Review & Payment
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Address state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");
  const [saveAddressToAccount, setSaveAddressToAccount] = useState<boolean>(true);

  // Form fields
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [line1, setLine1] = useState<string>("");
  const [line2, setLine2] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("CA");
  const [postalCode, setPostalCode] = useState<string>("90210");
  const [country, setCountry] = useState<string>("United States");
  const [customerNotes, setCustomerNotes] = useState<string>("");

  // Shipping & Quote state
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>("standard");
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);

  // Payment processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [razorpayScriptLoaded, setRazorpayScriptLoaded] = useState<boolean>(false);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setEmail(user.email);
      if (user.first_name || user.last_name) {
        setFullName(`${user.first_name || ""} ${user.last_name || ""}`.trim());
      }
    }
  }, [user]);

  // Load saved addresses for authenticated users
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      getAddresses(accessToken)
        .then((addrs) => {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            setFullName(defaultAddr.full_name);
            setPhone(defaultAddr.phone);
            setLine1(defaultAddr.line1);
            setLine2(defaultAddr.line2 || "");
            setCity(defaultAddr.city);
            setState(defaultAddr.state);
            setPostalCode(defaultAddr.postal_code);
            setCountry(defaultAddr.country);
          }
        })
        .catch((err) => console.error("Could not fetch addresses:", err));
    }
  }, [isAuthenticated, accessToken]);

  // Select a saved address
  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === "new") {
      setLine1("");
      setLine2("");
      setCity("");
      setState("");
      setPostalCode("");
    } else {
      const selected = savedAddresses.find((a) => a.id === addrId);
      if (selected) {
        setFullName(selected.full_name);
        setPhone(selected.phone);
        setLine1(selected.line1);
        setLine2(selected.line2 || "");
        setCity(selected.city);
        setState(selected.state);
        setPostalCode(selected.postal_code);
        setCountry(selected.country);
      }
    }
  };

  // Fetch server quote whenever destination changes or on load
  const fetchQuote = useCallback(async () => {
    if (!cart || cart.items.length === 0) return;
    try {
      setIsQuoteLoading(true);
      const q = await getCheckoutQuote(
        { country, state, postal_code: postalCode },
        cart.guest_token,
        accessToken
      );
      setQuote(q);
    } catch (err) {
      console.error("Failed to fetch checkout quote:", err);
    } finally {
      setIsQuoteLoading(false);
    }
  }, [cart, country, state, postalCode, accessToken]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // Calculate chosen shipping fee and total based on server quote
  const selectedShippingOption: ShippingOption | undefined = quote?.shipping_options.find(
    (o) => o.id === selectedShippingMethod
  );
  const shippingAmount = selectedShippingOption ? selectedShippingOption.amount : 25;
  const subtotalAmount = quote?.subtotal ?? (cart?.subtotal || 0);
  const taxAmount = quote?.tax_amount ?? Number((subtotalAmount * 0.0825).toFixed(2));
  const calculatedTotal = Number((subtotalAmount + shippingAmount + taxAmount).toFixed(2));

  // Step 1 Validation
  const handleProceedToShipping = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!fullName.trim() || !phone.trim() || !line1.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMessage("Please complete all required delivery address fields.");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 2 Validation
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Execute Payment and Order Confirmation
  const handleInitiatePayment = async () => {
    try {
      setIsProcessingPayment(true);
      setErrorMessage(null);

      const addressPayload: AddressCreatePayload = {
        full_name: fullName,
        phone,
        line1,
        line2: line2 || null,
        city,
        state,
        postal_code: postalCode,
        country,
        address_type: "home",
      };

      // If user requested to save address and is authenticated
      if (isAuthenticated && accessToken && selectedAddressId === "new" && saveAddressToAccount) {
        try {
          await createAddress(addressPayload, accessToken);
        } catch (addrErr) {
          console.warn("Could not auto-save address to user profile:", addrErr);
        }
      }

      // 1. Create Pending Order
      const order = await createCheckoutOrder(
        {
          shipping_address: addressPayload,
          shipping_method: selectedShippingMethod,
          customer_notes: customerNotes || undefined,
        },
        cart?.guest_token,
        accessToken
      );

      // 2. Create Payment Gateway Session
      const session = await createRazorpayPaymentSession(order.id, accessToken);

      // Check if Razorpay SDK is available and live
      const isRazorpayMock =
        session.key_id.startsWith("rzp_test_placeholder") ||
        session.key_id.startsWith("rzp_test_mock") ||
        typeof window.Razorpay === "undefined";

      if (!isRazorpayMock && window.Razorpay) {
        // Open live/test Razorpay modal
        const rzpOptions = {
          key: session.key_id,
          amount: session.amount_cents,
          currency: session.currency,
          name: "DRAPE ATELIER",
          description: `Order ${session.order_number}`,
          order_id: session.razorpay_order_id,
          prefill: {
            name: fullName,
            email: email,
            contact: phone,
          },
          theme: {
            color: "#111111",
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await verifyRazorpayPayment(
                {
                  order_id: order.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                accessToken
              );
              await refreshCart();
              router.push(`/checkout/success?order_id=${verifyRes.order_id}`);
            } catch (vErr: any) {
              console.error("Payment verification failed:", vErr);
              router.push(
                `/checkout/failure?order_id=${order.id}&reason=${encodeURIComponent(
                  vErr?.detail || "Payment verification failed"
                )}`
              );
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessingPayment(false);
            },
          },
        };

        const rzpInstance = new window.Razorpay(rzpOptions);
        rzpInstance.open();
      } else {
        // Test / Mock signature fallback for sandbox testing without external banking popup
        const mockSignature = "valid_mock_signature";
        const verifyRes = await verifyRazorpayPayment(
          {
            order_id: order.id,
            razorpay_order_id: session.razorpay_order_id,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: mockSignature,
          },
          accessToken
        );

        await refreshCart();
        router.push(`/checkout/success?order_id=${verifyRes.order_id}`);
      }
    } catch (err: any) {
      console.error("Order processing error:", err);
      setErrorMessage(
        err?.detail || err?.message || "An unexpected error occurred while placing your order."
      );
      setIsProcessingPayment(false);
    }
  };

  if (isCartLoading && !cart) {
    return (
      <div className="bg-warm-ivory min-h-screen py-32 text-center text-ink-black">
        <div className="inline-block w-8 h-8 border-2 border-ink-black/20 border-t-electric-blue rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-ink-black/60">
          Preparing Atelier Checkout...
        </p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="bg-warm-ivory min-h-screen py-24 text-ink-black">
        <div className="max-w-xl mx-auto px-6 text-center border border-dashed border-ink-black/20 p-12">
          <ShoppingBag className="w-12 h-12 stroke-[1] text-ink-black/40 mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-light mb-3">Your Bag is Empty</h1>
          <p className="font-sans text-xs text-ink-black/60 mb-8 leading-relaxed">
            Please curate pieces into your atelier bag prior to initializing checkout.
          </p>
          <Link
            href="/collections"
            className="inline-block px-8 py-3.5 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
          >
            Explore Ready-To-Wear
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayScriptLoaded(true)}
      />

      <div className="bg-warm-ivory min-h-screen text-ink-black py-12 lg:py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          {/* Header & Breadcrumb Tracker */}
          <div className="border-b border-ink-black/10 pb-8 mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-2">
                  CLIENT ATELIER • SECURE TRANSACTION
                </span>
                <h1 className="font-serif text-3xl sm:text-4xl font-light tracking-tight text-ink-black">
                  Atelier Checkout
                </h1>
              </div>

              {/* Step indicator */}
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span
                  className={`pb-1 border-b-2 transition-colors ${
                    currentStep >= 1
                      ? "border-electric-blue text-ink-black font-medium"
                      : "border-transparent text-ink-black/40"
                  }`}
                >
                  01. Address
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-ink-black/30" />
                <span
                  className={`pb-1 border-b-2 transition-colors ${
                    currentStep >= 2
                      ? "border-electric-blue text-ink-black font-medium"
                      : "border-transparent text-ink-black/40"
                  }`}
                >
                  02. Shipping
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-ink-black/30" />
                <span
                  className={`pb-1 border-b-2 transition-colors ${
                    currentStep >= 3
                      ? "border-electric-blue text-ink-black font-medium"
                      : "border-transparent text-ink-black/40"
                  }`}
                >
                  03. Payment
                </span>
              </div>
            </div>
          </div>

          {/* Global Error Banner */}
          {errorMessage && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center space-x-2 rounded-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Main 2-Column Checkout Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Left Column: Multi-Stage Steps */}
            <div className="lg:col-span-7 space-y-10">
              {/* STAGE 1: Information & Delivery Address */}
              <div
                className={`bg-white/70 border border-ink-black/10 p-6 sm:p-8 transition-opacity ${
                  currentStep === 1 ? "opacity-100" : "opacity-90"
                }`}
              >
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-ink-black/10">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-ink-black text-warm-ivory flex items-center justify-center font-mono text-xs">
                      1
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-black">
                      Delivery Address
                    </h2>
                  </div>
                  {currentStep > 1 && (
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="font-mono text-[11px] uppercase tracking-wider text-electric-blue hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 1 ? (
                  <form onSubmit={handleProceedToShipping} className="space-y-6">
                    {/* Saved Addresses for Authenticated Customers */}
                    {savedAddresses.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70">
                          Select Saved Address
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              onClick={() => handleSelectSavedAddress(addr.id)}
                              className={`p-4 border cursor-pointer transition-colors text-xs ${
                                selectedAddressId === addr.id
                                  ? "border-ink-black bg-ink-black/5"
                                  : "border-ink-black/15 hover:border-ink-black/40"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-ink-black">
                                  {addr.full_name}
                                </span>
                                {addr.is_default && (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-ink-black text-warm-ivory">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-ink-black/70 line-clamp-1">{addr.line1}</p>
                              <p className="text-ink-black/70">
                                {addr.city}, {addr.state} {addr.postal_code}
                              </p>
                            </div>
                          ))}

                          <div
                            onClick={() => handleSelectSavedAddress("new")}
                            className={`p-4 border border-dashed cursor-pointer transition-colors text-xs flex items-center justify-center space-x-2 ${
                              selectedAddressId === "new"
                                ? "border-electric-blue bg-electric-blue/5 text-electric-blue"
                                : "border-ink-black/20 text-ink-black/60 hover:border-ink-black/40"
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add New Address</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Address Fields Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Helena Vance"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Email (for Order Confirmation) *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="client@drape.fashion"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={line1}
                          onChange={(e) => setLine1(e.target.value)}
                          placeholder="144 East 76th Street, Apt 11B"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Apartment, Suite, Unit (Optional)
                        </label>
                        <input
                          type="text"
                          value={line2}
                          onChange={(e) => setLine2(e.target.value)}
                          placeholder="Penthouse Suite"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="New York"
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                            State *
                          </label>
                          <input
                            type="text"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="NY"
                            className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                            Postal Code *
                          </label>
                          <input
                            type="text"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="10021"
                            className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                          Country *
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none"
                        >
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="France">France</option>
                          <option value="Italy">Italy</option>
                          <option value="Japan">Japan</option>
                          <option value="Germany">Germany</option>
                        </select>
                      </div>
                    </div>

                    {isAuthenticated && selectedAddressId === "new" && (
                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="save_addr"
                          checked={saveAddressToAccount}
                          onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                          className="accent-ink-black"
                        />
                        <label
                          htmlFor="save_addr"
                          className="font-mono text-[11px] text-ink-black/70 cursor-pointer"
                        >
                          Save this address to my DRAPE profile for future purchases
                        </label>
                      </div>
                    )}

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>Continue to Shipping Method</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-xs font-mono text-ink-black/80 space-y-1">
                    <p className="font-semibold text-ink-black">{fullName}</p>
                    <p>{line1}{line2 ? `, ${line2}` : ""}</p>
                    <p>{city}, {state} {postalCode}, {country}</p>
                    <p className="text-ink-black/60 pt-1">Tel: {phone} • {email}</p>
                  </div>
                )}
              </div>

              {/* STAGE 2: Shipping Method */}
              <div
                className={`bg-white/70 border border-ink-black/10 p-6 sm:p-8 transition-opacity ${
                  currentStep === 2 ? "opacity-100" : "opacity-90"
                }`}
              >
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-ink-black/10">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-ink-black text-warm-ivory flex items-center justify-center font-mono text-xs">
                      2
                    </span>
                    <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-black">
                      Shipping Method
                    </h2>
                  </div>
                  {currentStep > 2 && (
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="font-mono text-[11px] uppercase tracking-wider text-electric-blue hover:underline"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 2 ? (
                  <form onSubmit={handleProceedToReview} className="space-y-4">
                    <div className="space-y-3">
                      {(quote?.shipping_options || [
                        {
                          id: "standard",
                          name: "Standard Insured Atelier Delivery",
                          description: "3-5 business days. Complimentary on orders over $500.",
                          amount: subtotalAmount >= 500 ? 0 : 25,
                          estimated_days: "3-5 business days",
                          is_complimentary: subtotalAmount >= 500,
                        },
                        {
                          id: "express",
                          name: "Priority Air Courier",
                          description: "1-2 business days with insured signature.",
                          amount: 45,
                          estimated_days: "1-2 business days",
                          is_complimentary: false,
                        },
                        {
                          id: "atelier",
                          name: "White-Glove Atelier Courier",
                          description: "Next-day hand delivery with fit consultation specialist.",
                          amount: subtotalAmount >= 1500 ? 0 : 75,
                          estimated_days: "Next-day delivery",
                          is_complimentary: subtotalAmount >= 1500,
                        },
                      ]).map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-start justify-between p-4 border cursor-pointer transition-colors ${
                            selectedShippingMethod === option.id
                              ? "border-ink-black bg-ink-black/5"
                              : "border-ink-black/15 hover:border-ink-black/30"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={option.id}
                              checked={selectedShippingMethod === option.id}
                              onChange={() => setSelectedShippingMethod(option.id)}
                              className="mt-1 accent-ink-black"
                            />
                            <div>
                              <p className="font-semibold text-xs text-ink-black">
                                {option.name}
                              </p>
                              <p className="font-sans text-[11px] text-ink-black/60 mt-0.5">
                                {option.description}
                              </p>
                              <span className="inline-block mt-1 font-mono text-[10px] text-ink-black/50">
                                {option.estimated_days}
                              </span>
                            </div>
                          </div>
                          <div className="font-mono text-xs text-right">
                            {option.amount === 0 ? (
                              <span className="text-emerald-700 font-medium">COMPLIMENTARY</span>
                            ) : (
                              <span>${option.amount.toFixed(2)} USD</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="py-4 px-6 border border-ink-black/20 text-ink-black text-xs font-mono uppercase tracking-widest hover:border-ink-black transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2"
                      >
                        <span>Review & Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : currentStep > 2 ? (
                  <div className="text-xs font-mono text-ink-black/80 flex justify-between items-center">
                    <div>
                      <p className="font-semibold capitalize text-ink-black">
                        {selectedShippingOption?.name || selectedShippingMethod}
                      </p>
                      <p className="text-ink-black/60 text-[11px]">
                        {selectedShippingOption?.estimated_days || "3-5 business days"}
                      </p>
                    </div>
                    <span className="font-medium">
                      {shippingAmount === 0 ? "Complimentary" : `$${shippingAmount.toFixed(2)} USD`}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink-black/40">
                    Complete address step to configure available logistics tiers.
                  </p>
                )}
              </div>

              {/* STAGE 3: Review & Payment Execution */}
              <div
                className={`bg-white/70 border border-ink-black/10 p-6 sm:p-8 transition-opacity ${
                  currentStep === 3 ? "opacity-100" : "opacity-90"
                }`}
              >
                <div className="flex items-center space-x-3 pb-4 mb-6 border-b border-ink-black/10">
                  <span className="w-6 h-6 rounded-full bg-ink-black text-warm-ivory flex items-center justify-center font-mono text-xs">
                    3
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-light text-ink-black">
                    Payment & Atelier Authorization
                  </h2>
                </div>

                {currentStep === 3 ? (
                  <div className="space-y-6">
                    {/* Optional Customer Notes */}
                    <div>
                      <label className="block font-mono text-[10px] tracking-wider uppercase text-ink-black/70 mb-1.5">
                        Archival Handling & Tailoring Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Provide special delivery gate instructions or concierge notes..."
                        className="w-full p-3 border border-ink-black/20 bg-warm-ivory/50 focus:border-ink-black focus:outline-none text-xs font-mono"
                      />
                    </div>

                    {/* Payment Gateway Callout */}
                    <div className="p-4 bg-ink-black/5 border border-ink-black/15 text-xs font-mono space-y-2">
                      <div className="flex items-center space-x-2 text-ink-black font-semibold">
                        <Lock className="w-4 h-4 text-emerald-700" />
                        <span>Secure Provider Gateway: Razorpay Global</span>
                      </div>
                      <p className="text-ink-black/70 text-[11px] leading-relaxed">
                        Transaction is authorized with end-to-end 256-bit encryption. Your payment
                        signature is cryptographically verified on the server before inventory is captured.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        disabled={isProcessingPayment}
                        className="py-4 px-6 border border-ink-black/20 text-ink-black text-xs font-mono uppercase tracking-widest hover:border-ink-black transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleInitiatePayment}
                        disabled={isProcessingPayment}
                        className="flex-1 py-4 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="w-4 h-4 border-2 border-warm-ivory/30 border-t-warm-ivory rounded-full animate-spin" />
                            <span>Authorizing Payment...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Authorize & Place Order • ${calculatedTotal.toFixed(2)} USD</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-ink-black/40">
                    Payment details will unlock once shipping logistics are selected.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Order Dossier & Real-Time Financials */}
            <div className="lg:col-span-5 bg-white/70 border border-ink-black/10 p-6 sm:p-8 space-y-6 sticky top-28">
              <div className="border-b border-ink-black/10 pb-4">
                <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-1">
                  ORDER SUMMARY
                </span>
                <h3 className="font-serif text-xl font-light text-ink-black">
                  Curated Garments ({cart.total_items})
                </h3>
              </div>

              {/* Items List */}
              <div className="divide-y divide-ink-black/10 max-h-[320px] overflow-y-auto pr-1">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4 text-xs">
                    <div className="w-16 h-20 bg-warm-ivory relative border border-ink-black/10 flex-shrink-0 overflow-hidden">
                      {item.primary_image ? (
                        <Image
                          src={item.primary_image}
                          alt={item.product_name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-ink-black/40">
                          DRAPE
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink-black truncate">{item.product_name}</p>
                      <p className="font-mono text-[10px] text-ink-black/60 uppercase">
                        Size: {item.size} • Color: {item.color}
                      </p>
                      <p className="font-mono text-[10px] text-ink-black/50 mt-1">
                        Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="font-mono text-xs font-medium text-ink-black text-right">
                      ${item.line_total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Server-Side Financial Breakdown */}
              <div className="border-t border-ink-black/10 pt-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-ink-black/70">
                  <span>Bag Subtotal</span>
                  <span>${subtotalAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-ink-black/70">
                  <span>Shipping Logistics</span>
                  <span>
                    {shippingAmount === 0 ? "Complimentary" : `$${shippingAmount.toFixed(2)} USD`}
                  </span>
                </div>
                <div className="flex justify-between text-ink-black/70">
                  <span>Estimated Tax ({((quote?.tax_rate || 0.0825) * 100).toFixed(2)}%)</span>
                  <span>${taxAmount.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-ink-black font-semibold text-sm pt-2 border-t border-ink-black/10">
                  <span>Total Due</span>
                  <span>${calculatedTotal.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Atelier Guarantees */}
              <div className="pt-4 border-t border-ink-black/10 space-y-2.5 text-[10px] font-mono text-ink-black/60">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Insured Global Atelier Courier</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-ink-black/50 flex-shrink-0" />
                  <span>14-Day Atelier Returns & Archival Packaging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
