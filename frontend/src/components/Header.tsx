"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, User, Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>

      {/* Main Luxury Navigation Bar */}
      <header className="sticky top-0 z-50 bg-warm-ivory/95 backdrop-blur-md border-b border-ink-black/10 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20 sm:h-24">
            {/* Left Editorial Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-10 text-[11px] uppercase tracking-widest font-medium text-ink-black/90">
              <Link
                href="#collections"
                className="hover:text-electric-blue transition-colors duration-200 relative group py-2"
              >
                Collections
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-electric-blue group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="#try-on"
                className="hover:text-electric-blue transition-colors duration-200 relative group py-2"
              >
                Try-On Studio
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-electric-blue group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="#wardrobe"
                className="hover:text-electric-blue transition-colors duration-200 relative group py-2"
              >
                The Wardrobe
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-electric-blue group-hover:w-full transition-all duration-300" />
              </Link>
              <Link
                href="#stylist"
                className="hover:text-electric-blue transition-colors duration-200 relative group py-2"
              >
                AI Stylist
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-electric-blue group-hover:w-full transition-all duration-300" />
              </Link>
            </nav>

            {/* Centered DRAPE Wordmark (Haute Couture Identity) */}
            <div className="flex-1 lg:flex-initial text-left lg:text-center">
              <Link
                href="/"
                className="inline-block font-serif text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-editorial text-ink-black hover:opacity-90 transition-opacity"
              >
                DRAPE
              </Link>
            </div>

            {/* Right Utility Icons (Minimalist Luxury) */}
            <div className="hidden lg:flex items-center space-x-7 text-ink-black/80">
              <span className="text-[10px] uppercase tracking-widest text-ink-black/50 font-mono pr-2 border-r border-ink-black/15">
                INTL / USD ($)
              </span>
              <button
                aria-label="Search Catalog"
                className="p-1 hover:text-electric-blue transition-colors duration-200"
              >
                <Search className="w-4 h-4 stroke-[1.25]" />
              </button>
              <button
                aria-label="Customer Account"
                className="p-1 hover:text-electric-blue transition-colors duration-200"
              >
                <User className="w-4 h-4 stroke-[1.25]" />
              </button>
              <button
                aria-label="Shopping Bag"
                className="p-1 relative hover:text-electric-blue transition-colors duration-200"
              >
                <ShoppingBag className="w-4 h-4 stroke-[1.25]" />
                <span className="absolute -top-1.5 -right-1.5 bg-ink-black text-warm-ivory text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono">
                  0
                </span>
              </button>
            </div>

            {/* Mobile Controls */}
            <div className="flex lg:hidden items-center space-x-4">
              <button
                aria-label="Shopping Bag"
                className="p-1 text-ink-black relative"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 text-ink-black"
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6 stroke-[1.5]" />
                ) : (
                  <Menu className="w-6 h-6 stroke-[1.5]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-warm-ivory border-b border-ink-black/15 px-6 py-8 space-y-6 text-xs uppercase tracking-widest font-medium animate-fadeIn">
            <Link
              href="#collections"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-ink-black hover:text-electric-blue border-b border-ink-black/5"
            >
              Collections
            </Link>
            <Link
              href="#try-on"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-ink-black hover:text-electric-blue border-b border-ink-black/5"
            >
              Try-On Studio
            </Link>
            <Link
              href="#wardrobe"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-ink-black hover:text-electric-blue border-b border-ink-black/5"
            >
              The Wardrobe
            </Link>
            <Link
              href="#stylist"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-ink-black hover:text-electric-blue border-b border-ink-black/5"
            >
              AI Stylist
            </Link>
            <div className="pt-4 flex justify-between text-[10px] text-ink-black/50 font-mono">
              <span>EDITION: 2026.01</span>
              <span>CURRENCY: USD ($)</span>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
