"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { user, register, loading: authLoading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Independent Granular Consents (PRD FR-006 & SEC-001)
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [cameraOptIn, setCameraOptIn] = useState(false);
  const [aiStorageOptIn, setAiStorageOptIn] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/account");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAgreed) {
      setErrorMessage("You must accept the DRAPE Terms of Service and Privacy Notice to register.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Atelier passwords must contain at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        camera_processing_opt_in: cameraOptIn,
        ai_tryon_storage_opt_in: aiStorageOptIn,
        marketing_emails_opt_in: marketingOptIn,
        analytics_opt_in: true,
      });
      router.push("/account");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || "Registration failed.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected registration error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center bg-warm-ivory py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 border border-ink-black/15 shadow-sm overflow-hidden bg-warm-ivory">
        {/* Left Column: Haute-Couture Editorial Visual (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 relative bg-ink-black min-h-[720px] overflow-hidden">
          <Image
            src="/images/fashion-69822ecb7c423.avif"
            alt="DRAPE Editorial Campaign — Male model in brown wool coat under dramatic sky"
            fill
            className="object-cover object-top filter brightness-[0.92] contrast-[1.05]"
            sizes="40vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-black/95 via-ink-black/40 to-transparent" />

          {/* Editorial Top Notation */}
          <div className="relative z-10 p-8 flex justify-between items-start">
            <span className="bg-warm-ivory text-ink-black text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 font-semibold">
              NEW CLIENT DOSSIER • 2026
            </span>
            <span className="text-[9px] uppercase tracking-widest font-mono text-warm-ivory/70">
              ISSUE NO. 09
            </span>
          </div>

          {/* Bottom Callout Overlay */}
          <div className="absolute bottom-8 left-8 right-8 z-10 space-y-3 text-warm-ivory">
            <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest text-acid-lime font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Independent Privacy Governance</span>
            </div>
            <p className="font-serif italic text-base sm:text-lg font-light leading-snug">
              &ldquo;DRAPE strictly isolates your camera drape sessions and AI try-on looks.
              Personal data remains under your sovereign control.&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Registration Dossier (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between space-y-8">
          <div>
            {/* Header */}
            <div className="space-y-3 pb-6 border-b border-ink-black/10">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                <span>PORTFOLIO I</span>
                <span>•</span>
                <span>CLIENT ONBOARDING</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif font-normal text-ink-black tracking-tight">
                Create Your <span className="italic font-light">Account.</span>
              </h1>
              <p className="text-xs sm:text-sm text-ink-black/70 font-light leading-relaxed max-w-lg">
                Register a private client account to preserve purchased silhouettes in your
                Digital Wardrobe, experience real-time 3D drape simulation, and access our neural stylist.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="mt-6 p-4 bg-burgundy/10 border border-burgundy/20 flex items-start space-x-3 text-burgundy text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-light leading-relaxed">
                  <span className="font-semibold block font-mono uppercase tracking-wider text-[10px]">
                    Registration Notice
                  </span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="firstName"
                    className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Elena"
                    className="w-full px-4 py-2.5 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="lastName"
                    className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Rostova"
                    className="w-full px-4 py-2.5 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                >
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@atelier.fashion"
                  className="w-full px-4 py-2.5 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                >
                  Password (Minimum 8 Characters) *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 pr-10 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-black/50 hover:text-ink-black transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Granular Independent Consent Preferences Box */}
              <div className="pt-2 pb-1 space-y-3 border-t border-ink-black/10">
                <div className="text-[10px] uppercase tracking-widest font-mono text-ink-black/50 font-medium">
                  Independent Privacy & Consent Options
                </div>

                {/* Mandatory Terms */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded-none border-ink-black/30 text-ink-black focus:ring-0"
                  />
                  <span className="text-[11px] text-ink-black/80 font-light leading-snug">
                    I agree to the DRAPE{" "}
                    <span className="underline font-medium">Terms of Service</span> and{" "}
                    <span className="underline font-medium">Privacy Notice</span>. *
                  </span>
                </label>

                {/* Optional Camera Drape Consent */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cameraOptIn}
                    onChange={(e) => setCameraOptIn(e.target.checked)}
                    className="mt-0.5 rounded-none border-ink-black/30 text-ink-black focus:ring-0"
                  />
                  <span className="text-[11px] text-ink-black/70 font-light leading-snug">
                    <strong className="font-medium text-ink-black">Live Camera Drape (Optional):</strong>{" "}
                    Opt in to local on-device 3D body landmark tracking in volatile browser memory.
                  </span>
                </label>

                {/* Optional AI Storage Consent */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiStorageOptIn}
                    onChange={(e) => setAiStorageOptIn(e.target.checked)}
                    className="mt-0.5 rounded-none border-ink-black/30 text-ink-black focus:ring-0"
                  />
                  <span className="text-[11px] text-ink-black/70 font-light leading-snug">
                    <strong className="font-medium text-ink-black">AI Try-On Storage (Optional):</strong>{" "}
                    Permit temporary storage of your synthesized try-on looks in your private wardrobe vault.
                  </span>
                </label>

                {/* Optional Marketing Consent */}
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 rounded-none border-ink-black/30 text-ink-black focus:ring-0"
                  />
                  <span className="text-[11px] text-ink-black/70 font-light leading-snug">
                    <strong className="font-medium text-ink-black">Atelier Dispatches (Optional):</strong>{" "}
                    Receive private collection notifications and seasonal couture previews.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-widest font-semibold hover:bg-deep-espresso transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 group"
                >
                  {isSubmitting ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Establish Client Account</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Callout */}
          <div className="pt-4 border-t border-ink-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-ink-black/70 gap-2">
            <span>Already hold a registered account?</span>
            <Link
              href="/login"
              className="text-xs uppercase tracking-widest font-semibold text-ink-black hover:text-electric-blue transition-colors flex items-center"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

