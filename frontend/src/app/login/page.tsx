"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectPath =
    rawRedirect &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/\\")
      ? rawRedirect
      : "/account";

  const { user, login, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectPath);
    }
  }, [user, authLoading, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push(redirectPath);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.problem.detail || "Authentication failed.");
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center bg-warm-ivory py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1280px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 border border-ink-black/15 shadow-sm overflow-hidden bg-warm-ivory">
        {/* Left Column: Haute-Couture Editorial Visual (5 cols) */}
        <div className="hidden lg:block lg:col-span-5 relative bg-ink-black min-h-[640px] overflow-hidden">
          <Image
            src="/images/Suzuki-Kai-mens-style-photoshoot-shoot-fashion-trends-for-men-11-2025-1.jpg"
            alt="DRAPE Editorial Campaign — Model in dual tone trench coat"
            fill
            className="object-cover object-top filter brightness-[0.92] contrast-[1.05]"
            sizes="40vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-black/95 via-ink-black/40 to-transparent" />

          {/* Editorial Top Notation */}
          <div className="relative z-10 p-8 flex justify-between items-start">
            <span className="bg-warm-ivory text-ink-black text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 font-semibold">
              ATELIER IDENTITY • ISSUE 09
            </span>
            <span className="text-[9px] uppercase tracking-widest font-mono text-warm-ivory/70">
              PRIVATE CLIENT
            </span>
          </div>

          {/* Bottom Quote Overlay */}
          <div className="absolute bottom-8 left-8 right-8 z-10 space-y-3 text-warm-ivory">
            <p className="font-serif italic text-lg sm:text-xl font-light leading-snug">
              &ldquo;True elegance is personal permanence — clothes tailored not only to
              the body, but to the memory of movement.&rdquo;
            </p>
            <div className="text-[10px] uppercase tracking-widest font-mono text-warm-ivory/60">
              DRAPE ATELIER NOTES • MILAN & PARIS
            </div>
          </div>
        </div>

        {/* Right Column: Refined Minimalist Login Form (7 cols) */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-between space-y-10">
          <div>
            {/* Masthead */}
            <div className="space-y-3 pb-8 border-b border-ink-black/10">
              <div className="flex items-center space-x-2 text-[10px] uppercase tracking-widest font-mono text-ink-black/50">
                <span>PORTFOLIO I</span>
                <span>•</span>
                <span>CLIENT AUTHENTICATION</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif font-normal text-ink-black tracking-tight">
                Welcome <span className="italic font-light">Back.</span>
              </h1>
              <p className="text-xs sm:text-sm text-ink-black/70 font-light leading-relaxed max-w-md">
                Enter your credentials to access your private wardrobe vault, personal
                fitting sessions, and bespoke neural stylist suggestions.
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
                    Authentication Notice
                  </span>
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@atelier.fashion"
                  className="w-full px-4 py-3 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="password"
                    className="block text-[10px] uppercase tracking-widest font-mono text-ink-black/70 font-medium"
                  >
                    Atelier Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 pr-10 bg-transparent border border-ink-black/20 text-xs sm:text-sm font-light text-ink-black placeholder:text-ink-black/30 focus:outline-none focus:border-ink-black transition-colors"
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-ink-black text-warm-ivory text-xs uppercase tracking-widest font-semibold hover:bg-deep-espresso transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 group"
                >
                  {isSubmitting ? (
                    <span>Verifying Credentials...</span>
                  ) : (
                    <>
                      <span>Enter Client Sanctuary</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Callout */}
          <div className="pt-6 border-t border-ink-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-ink-black/70 gap-2">
            <span>Do not yet hold a private client portfolio?</span>
            <Link
              href="/register"
              className="text-xs uppercase tracking-widest font-semibold text-ink-black hover:text-electric-blue transition-colors flex items-center"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-warm-ivory">
          <span className="text-xs uppercase tracking-widest font-mono text-ink-black/50">
            Loading Atelier Identity...
          </span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
