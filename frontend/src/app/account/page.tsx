"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User as UserIcon,
  Shield,
  Camera,
  Sparkles,
  Mail,
  BarChart3,
  LogOut,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Package,
  MapPin,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  UserConsent,
  ApiError,
  Address,
  AddressCreatePayload,
  Order,
  getAddresses,
  createAddress,
  deleteAddress,
  setDefaultAddress,
  getOrders,
} from "@/lib/api";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, accessToken, logout, updateProfile, getConsents, updateConsents } =
    useAuth();

  // Active dashboard tab: 'profile' | 'orders' | 'addresses'
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "addresses">("profile");

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Consents State
  const [consents, setConsents] = useState<UserConsent | null>(null);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [updatingConsentKey, setUpdatingConsentKey] = useState<string | null>(null);
  const [consentSuccessMsg, setConsentSuccessMsg] = useState<string | null>(null);
  const [consentErrorMsg, setConsentErrorMsg] = useState<string | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressCreatePayload>({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "CA",
    postal_code: "90210",
    country: "United States",
    address_type: "home",
    is_default: false,
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Route protection
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/account");
    }
  }, [user, loading, router]);

  // Initialize profile values
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  // Load consents
  useEffect(() => {
    async function loadConsents() {
      if (!user) return;
      try {
        setLoadingConsents(true);
        const data = await getConsents();
        setConsents(data);
      } catch (err: unknown) {
        setConsentErrorMsg(
          err instanceof ApiError ? err.problem.detail : "Could not load consents"
        );
      } finally {
        setLoadingConsents(false);
      }
    }
    if (user) {
      loadConsents();
    }
  }, [user, getConsents]);

  // Load addresses when addresses tab is selected
  const loadAddresses = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoadingAddresses(true);
      const data = await getAddresses(accessToken);
      setAddresses(data);
    } catch (err) {
      console.error("Failed to load addresses:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }, [accessToken]);

  // Load orders when orders tab is selected
  const loadOrders = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoadingOrders(true);
      const data = await getOrders(accessToken);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === "addresses") loadAddresses();
    if (activeTab === "orders") loadOrders();
  }, [activeTab, loadAddresses, loadOrders]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      await updateProfile({
        first_name: firstName || null,
        last_name: lastName || null,
      });
      setProfileSuccessMsg("Profile details saved successfully.");
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setProfileErrorMsg(
        err instanceof ApiError ? err.problem.detail : "Failed to update profile."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleToggleConsent = async (
    key: keyof Pick<
      UserConsent,
      | "camera_processing_opt_in"
      | "ai_tryon_storage_opt_in"
      | "marketing_emails_opt_in"
      | "analytics_opt_in"
    >
  ) => {
    if (!consents) return;
    const nextVal = !consents[key];
    setUpdatingConsentKey(key);
    setConsentSuccessMsg(null);
    setConsentErrorMsg(null);

    try {
      const updated = await updateConsents({ [key]: nextVal });
      setConsents(updated);
      setConsentSuccessMsg("Consent preferences updated and synchronized.");
      setTimeout(() => setConsentSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setConsentErrorMsg(
        err instanceof ApiError
          ? err.problem.detail
          : "Could not update consent preference."
      );
    } finally {
      setUpdatingConsentKey(null);
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    try {
      await createAddress(newAddress, accessToken);
      setShowAddAddressModal(false);
      setNewAddress({
        full_name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "CA",
        postal_code: "90210",
        country: "United States",
        address_type: "home",
        is_default: false,
      });
      await loadAddresses();
    } catch (err) {
      console.error("Failed to create address:", err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!accessToken) return;
    try {
      await deleteAddress(id, accessToken);
      await loadAddresses();
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!accessToken) return;
    try {
      await setDefaultAddress(id, accessToken);
      await loadAddresses();
    } catch (err) {
      console.error("Failed to set default address:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-warm-ivory">
        <div className="flex items-center space-x-3 text-xs uppercase tracking-widest font-mono text-ink-black/60">
          <RefreshCw className="w-4 h-4 animate-spin text-electric-blue" />
          <span>Hydrating Client Dossier...</span>
        </div>
      </div>
    );
  }

  const formattedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Active Member";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-warm-ivory py-12 sm:py-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
        {/* Dossier Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-ink-black/10 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-[10px] uppercase tracking-widest font-mono text-ink-black/60">
              <span>CLIENT DOSSIER</span>
              <span>•</span>
              <span>ACCOUNT NO. {user.id.slice(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span className="text-electric-blue font-semibold">AUTHENTICATED</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-normal text-ink-black tracking-tight">
              Customer <span className="italic font-light">Archive.</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-2 px-4 py-2 border border-ink-black/20 hover:border-burgundy text-ink-black hover:text-burgundy text-xs uppercase tracking-widest font-mono font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center space-x-2 sm:space-x-8 mb-10 border-b border-ink-black/10 overflow-x-auto">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === "profile"
                ? "border-electric-blue text-ink-black font-semibold"
                : "border-transparent text-ink-black/60 hover:text-ink-black"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Profile & Consents</span>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === "orders"
                ? "border-electric-blue text-ink-black font-semibold"
                : "border-transparent text-ink-black/60 hover:text-ink-black"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
              activeTab === "addresses"
                ? "border-electric-blue text-ink-black font-semibold"
                : "border-transparent text-ink-black/60 hover:text-ink-black"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Saved Addresses ({addresses.length})</span>
          </button>
        </div>

        {/* TAB 1: PROFILE & INDEPENDENT CONSENTS */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Column: Client Credentials & Profile Editing (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              {/* Account Overview Card */}
              <div className="bg-warm-ivory border border-ink-black/15 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-ink-black/10">
                  <div className="flex items-center space-x-2.5">
                    <UserIcon className="w-4 h-4 text-ink-black" />
                    <span className="text-xs uppercase tracking-widest font-mono font-semibold text-ink-black">
                      Personal Identity
                    </span>
                  </div>
                  <span className="bg-warm-stone/20 text-ink-black text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border border-ink-black/10">
                    {user.roles.join(", ")}
                  </span>
                </div>

                {/* Readonly Core Credentials */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 block mb-0.5">
                      Account Email
                    </label>
                    <div className="p-3 bg-white/60 border border-ink-black/10 font-mono text-ink-black">
                      {user.email}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 block mb-0.5">
                      Account Registered
                    </label>
                    <div className="p-3 bg-white/60 border border-ink-black/10 font-mono text-ink-black/80">
                      {formattedDate}
                    </div>
                  </div>
                </div>

                {/* Editable Profile Form */}
                <form onSubmit={handleProfileSubmit} className="space-y-4 pt-4 border-t border-ink-black/10">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 font-semibold block">
                    Edit Client Name
                  </span>

                  {profileSuccessMsg && (
                    <div className="p-3 bg-acid-lime/20 border border-acid-lime/40 text-xs text-ink-black flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-ink-black shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}
                  {profileErrorMsg && (
                    <div className="p-3 bg-burgundy/10 border border-burgundy/20 text-xs text-burgundy flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 block mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Given Name"
                        className="w-full px-3 py-2 bg-white/80 border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black font-light"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 block mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Family Name"
                        className="w-full px-3 py-2 bg-white/80 border border-ink-black/20 text-xs text-ink-black focus:outline-none focus:border-ink-black font-light"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full py-3 bg-ink-black text-warm-ivory text-xs uppercase tracking-widest font-mono font-medium hover:bg-electric-blue transition-colors disabled:opacity-50"
                  >
                    {isUpdatingProfile ? "Updating Profile..." : "Save Profile Details"}
                  </button>
                </form>
              </div>

              {/* Quick Links Card */}
              <div className="bg-warm-ivory border border-ink-black/15 p-6 space-y-4 shadow-sm">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink-black/60 font-semibold block">
                  Atelier Portals
                </span>
                <div className="space-y-2">
                  <Link
                    href="/orders"
                    className="flex items-center justify-between p-3 border border-ink-black/10 hover:border-ink-black text-xs transition-colors group"
                  >
                    <span className="font-light">Client Order History</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/collections"
                    className="flex items-center justify-between p-3 border border-ink-black/10 hover:border-ink-black text-xs transition-colors group"
                  >
                    <span className="font-light">Explore Master Collections</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Independent Granular Consent Preferences (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
              <div className="bg-warm-ivory border border-ink-black/15 p-6 sm:p-10 space-y-8 shadow-sm">
                <div className="space-y-2 pb-5 border-b border-ink-black/10">
                  <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-electric-blue font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Sovereign Privacy Architecture</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-normal text-ink-black tracking-tight">
                    Independent Privacy & Consent Options
                  </h2>
                  <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                    DRAPE enforces PRD FR-006 and SEC-001 by guaranteeing that each consent
                    dimension is discrete. Modifying camera or AI try-on permissions does
                    not alter your commercial marketing choices.
                  </p>
                </div>

                {consentSuccessMsg && (
                  <div className="p-3 bg-acid-lime/20 border border-acid-lime/40 text-xs text-ink-black flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-ink-black shrink-0" />
                    <span>{consentSuccessMsg}</span>
                  </div>
                )}
                {consentErrorMsg && (
                  <div className="p-3 bg-burgundy/10 border border-burgundy/20 text-xs text-burgundy flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{consentErrorMsg}</span>
                  </div>
                )}

                {loadingConsents || !consents ? (
                  <div className="py-8 flex items-center justify-center space-x-2 text-xs font-mono text-ink-black/50">
                    <RefreshCw className="w-4 h-4 animate-spin text-electric-blue" />
                    <span>Loading privacy policies...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 1. Camera Processing Consent */}
                    <div className="p-5 border border-ink-black/10 hover:border-ink-black/25 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <Camera className="w-4 h-4 text-ink-black" />
                          <h3 className="text-sm font-serif font-normal text-ink-black tracking-tight">
                            Live Camera Drape Processing
                          </h3>
                        </div>
                        <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                          Enables real-time 3D garment drape preview via local browser WebGL/WASM.
                          Video streams are computed strictly in volatile device memory and are
                          never uploaded or recorded on DRAPE servers.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={updatingConsentKey === "camera_processing_opt_in"}
                        onClick={() => handleToggleConsent("camera_processing_opt_in")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          consents.camera_processing_opt_in ? "bg-ink-black" : "bg-ink-black/20"
                        }`}
                        role="switch"
                        aria-checked={consents.camera_processing_opt_in}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-warm-ivory shadow ring-0 transition duration-200 ease-in-out ${
                            consents.camera_processing_opt_in ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* 2. AI Try-On Image Storage Consent */}
                    <div className="p-5 border border-ink-black/10 hover:border-ink-black/25 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-ink-black" />
                          <h3 className="text-sm font-serif font-normal text-ink-black tracking-tight">
                            AI Try-On Image Archiving
                          </h3>
                        </div>
                        <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                          Permits DRAPE to retain uploaded reference images and rendered fitting
                          simulations within your encrypted client dossier. You can revoke this
                          permission at any time to purge cached renders.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={updatingConsentKey === "ai_tryon_storage_opt_in"}
                        onClick={() => handleToggleConsent("ai_tryon_storage_opt_in")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          consents.ai_tryon_storage_opt_in ? "bg-ink-black" : "bg-ink-black/20"
                        }`}
                        role="switch"
                        aria-checked={consents.ai_tryon_storage_opt_in}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-warm-ivory shadow ring-0 transition duration-200 ease-in-out ${
                            consents.ai_tryon_storage_opt_in ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* 3. Marketing Communications Consent */}
                    <div className="p-5 border border-ink-black/10 hover:border-ink-black/25 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-ink-black" />
                          <h3 className="text-sm font-serif font-normal text-ink-black tracking-tight">
                            Editorial Letters & Private Invitations
                          </h3>
                        </div>
                        <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                          Receive curated seasonal lookbooks, private salon invitations, and
                          early access to limited capsule releases.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={updatingConsentKey === "marketing_emails_opt_in"}
                        onClick={() => handleToggleConsent("marketing_emails_opt_in")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          consents.marketing_emails_opt_in ? "bg-ink-black" : "bg-ink-black/20"
                        }`}
                        role="switch"
                        aria-checked={consents.marketing_emails_opt_in}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-warm-ivory shadow ring-0 transition duration-200 ease-in-out ${
                            consents.marketing_emails_opt_in ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* 4. Analytics & Fitting Insights Consent */}
                    <div className="p-5 border border-ink-black/10 hover:border-ink-black/25 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4 text-ink-black" />
                          <h3 className="text-sm font-serif font-normal text-ink-black tracking-tight">
                            Atelier Telemetry & Sizing Analytics
                          </h3>
                        </div>
                        <p className="text-xs text-ink-black/70 font-light leading-relaxed">
                          Shares anonymized telemetry on garment rendering speeds and fit satisfaction
                          to help refine tailoring algorithms.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={updatingConsentKey === "analytics_opt_in"}
                        onClick={() => handleToggleConsent("analytics_opt_in")}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          consents.analytics_opt_in ? "bg-ink-black" : "bg-ink-black/20"
                        }`}
                        role="switch"
                        aria-checked={consents.analytics_opt_in}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-warm-ivory shadow ring-0 transition duration-200 ease-in-out ${
                            consents.analytics_opt_in ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ORDERS */}
        {activeTab === "orders" && (
          <div className="bg-white/70 border border-ink-black/15 p-6 sm:p-10 shadow-sm space-y-6">
            <div className="border-b border-ink-black/10 pb-4">
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-1">
                ACQUISITIONS HISTORY
              </span>
              <h2 className="font-serif text-2xl font-light text-ink-black">
                Recorded Atelier Orders
              </h2>
            </div>

            {loadingOrders ? (
              <div className="py-12 text-center text-xs font-mono text-ink-black/60">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-electric-blue" />
                <span>Loading order history...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-ink-black/20 p-8 max-w-md mx-auto">
                <Package className="w-10 h-10 text-ink-black/30 mx-auto mb-3" />
                <h3 className="font-serif text-xl font-light text-ink-black mb-2">No Orders Found</h3>
                <p className="font-sans text-xs text-ink-black/60 mb-6">
                  You have not placed any orders with DRAPE yet.
                </p>
                <Link
                  href="/collections"
                  className="inline-block px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
                >
                  Browse Collection
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 border border-ink-black/10 hover:border-ink-black/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div>
                      <span className="font-semibold text-ink-black block text-sm">
                        {ord.order_number}
                      </span>
                      <span className="text-ink-black/60 text-[11px]">
                        Placed on {new Date(ord.created_at).toLocaleDateString("en-US")} • {ord.items.length} items
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                          ord.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {ord.status}
                      </span>
                      <span className="font-semibold text-ink-black">
                        ${Number(ord.total_amount).toFixed(2)} USD
                      </span>
                      <Link
                        href={`/orders/${ord.id}`}
                        className="px-4 py-2 border border-ink-black/20 hover:border-ink-black uppercase tracking-wider text-[11px] hover:bg-ink-black hover:text-warm-ivory transition-colors"
                      >
                        View Dossier
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED ADDRESSES */}
        {activeTab === "addresses" && (
          <div className="bg-white/70 border border-ink-black/15 p-6 sm:p-10 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-ink-black/10 gap-4">
              <div>
                <span className="font-mono text-[10px] tracking-widest uppercase text-ink-black/60 block mb-1">
                  DELIVERY DESTINATIONS
                </span>
                <h2 className="font-serif text-2xl font-light text-ink-black">
                  Saved Client Addresses
                </h2>
              </div>
              <button
                onClick={() => setShowAddAddressModal(true)}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors self-start"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </div>

            {loadingAddresses ? (
              <div className="py-12 text-center text-xs font-mono text-ink-black/60">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-electric-blue" />
                <span>Loading saved addresses...</span>
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-ink-black/20 p-8 max-w-md mx-auto">
                <MapPin className="w-10 h-10 text-ink-black/30 mx-auto mb-3" />
                <h3 className="font-serif text-xl font-light text-ink-black mb-2">No Saved Addresses</h3>
                <p className="font-sans text-xs text-ink-black/60 mb-6">
                  Save your residential or atelier delivery destinations for streamlined checkout.
                </p>
                <button
                  onClick={() => setShowAddAddressModal(true)}
                  className="inline-block px-6 py-3 bg-ink-black text-warm-ivory text-xs font-mono uppercase tracking-widest hover:bg-electric-blue transition-colors"
                >
                  Add First Address
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-5 border border-ink-black/15 bg-warm-ivory/40 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-ink-black">{addr.full_name}</span>
                        {addr.is_default && (
                          <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-ink-black text-warm-ivory">
                            Default Address
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-ink-black/70 space-y-0.5">
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p>{addr.city}, {addr.state} {addr.postal_code}</p>
                        <p>{addr.country}</p>
                        <p className="text-ink-black/50 pt-1">Tel: {addr.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-ink-black/10 text-xs font-mono">
                      {!addr.is_default ? (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-electric-blue hover:underline uppercase text-[10px]"
                        >
                          Set as Default
                        </button>
                      ) : (
                        <span className="text-emerald-700 uppercase text-[10px] font-semibold flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Primary Default</span>
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-red-600 hover:text-red-800 flex items-center space-x-1 uppercase text-[10px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Address Modal */}
            {showAddAddressModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/70 backdrop-blur-sm">
                <div className="bg-warm-ivory border border-ink-black/20 max-w-lg w-full p-6 sm:p-8 space-y-6">
                  <div className="border-b border-ink-black/10 pb-3">
                    <h3 className="font-serif text-xl font-light text-ink-black">
                      Add New Delivery Destination
                    </h3>
                  </div>

                  <form onSubmit={handleCreateAddress} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] uppercase block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                          className="w-full p-2.5 border border-ink-black/20 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase block mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          className="w-full p-2.5 border border-ink-black/20 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] uppercase block mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.line1}
                        onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                        className="w-full p-2.5 border border-ink-black/20 bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] uppercase block mb-1">
                        Apartment, Suite (Optional)
                      </label>
                      <input
                        type="text"
                        value={newAddress.line2 || ""}
                        onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                        className="w-full p-2.5 border border-ink-black/20 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="font-mono text-[10px] uppercase block mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="w-full p-2.5 border border-ink-black/20 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase block mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                          className="w-full p-2.5 border border-ink-black/20 bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] uppercase block mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={newAddress.postal_code}
                          onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                          className="w-full p-2.5 border border-ink-black/20 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="modal_default"
                        checked={newAddress.is_default || false}
                        onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                      />
                      <label htmlFor="modal_default" className="font-mono text-[11px] text-ink-black/70 cursor-pointer">
                        Set as primary default address
                      </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-ink-black/10">
                      <button
                        type="button"
                        onClick={() => setShowAddAddressModal(false)}
                        className="px-4 py-2 border border-ink-black/20 font-mono text-xs uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-ink-black text-warm-ivory font-mono text-xs uppercase tracking-widest hover:bg-electric-blue transition-colors"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
