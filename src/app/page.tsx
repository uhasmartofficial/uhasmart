import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CategoryCard from "@/components/CategoryCard";
import FeaturedListings from "@/components/FeaturedListings";
import HeroSearchBar from "@/components/HeroSearchBar";
import HostelFinderSection from "@/components/HostelFinderSection";
import SafetyBanner from "@/components/SafetyBanner";
import { categories } from "@/lib/data";
import {
  ArrowRight,
  ShoppingBag,
  Store,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white dark:bg-slate-900/60 py-10 sm:py-20 border-b border-gray-100 dark:border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] dark:opacity-[0.07]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Student &amp; Campus Marketplace &bull; Ho, Volta Region</span>
            </div>

            <h1 className="mx-auto mt-4 sm:mt-6 max-w-4xl text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900 dark:text-white">
              Your Campus &amp; City. <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Your Marketplace.</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-base text-gray-600 dark:text-slate-300 leading-relaxed">
              Find student hostels, groceries, salons, gadgets, food, and services across all campus hubs — from Sokode, Dave, and Trafalgar to Bankoe, Dome, and Ho Central.
            </p>

            {/* Live Interactive Search Bar + Trending Chips */}
            <HeroSearchBar />

            {/* Quick Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-md sm:max-w-none mx-auto">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Browse Marketplace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register-business"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3.5 text-xs sm:text-sm font-bold text-gray-800 dark:text-white shadow-sm hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Sell on VarsMart</span>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="mx-auto mt-8 sm:mt-12 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4 border-t border-gray-100 dark:border-slate-800 pt-6 sm:pt-8">
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 p-2.5 sm:p-4 border border-gray-100 dark:border-slate-700/50">
                <p className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">GHS 0</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400">Free to List</p>
              </div>
              <div className="rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 p-2.5 sm:p-4 border border-blue-100 dark:border-blue-900/50">
                <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">4+</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400">Campuses &amp; Hostels</p>
              </div>
              <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 p-2.5 sm:p-4 border border-gray-100 dark:border-slate-700/50">
                <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">100%</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400">Direct WhatsApp</p>
              </div>
            </div>
          </div>
        </section>

        {/* CAMPUS TRUST & SAFETY NOTICE */}
        <SafetyBanner />

        {/* POPULAR CATEGORIES */}
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Explore Marketplace</span>
                <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                  Popular Categories in Ho
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <span>View all products</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </div>
        </section>

        {/* DEDICATED HOSTEL & ACCOMMODATION FINDER SECTION */}
        <HostelFinderSection />

        {/* LIVE CAMPUS LISTINGS & TRUST SECTION */}
        <FeaturedListings />

        {/* HOW IT WORKS */}
        <section className="py-10 sm:py-16 bg-white dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Simple &amp; Safe</span>
              <h2 className="mt-1 text-2xl font-black text-gray-900 dark:text-white sm:text-3xl">
                How VarsMart Works
              </h2>
            </div>

            <div className="mt-8 grid gap-3 sm:gap-6 sm:grid-cols-3 text-center">
              <div className="rounded-3xl border border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-lg font-black text-blue-600 dark:text-blue-400">
                  1
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900 dark:text-white">Create an Account</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                  Join with your student email as a Customer or register your student business in under 60 seconds.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950 text-lg font-black text-purple-600 dark:text-purple-400">
                  2
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900 dark:text-white">Browse or List Items</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                  Find deals by category and Ho campus area, or post your items with price in Ghana Cedis.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-lg font-black text-emerald-600 dark:text-emerald-400">
                  3
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900 dark:text-white">Connect &amp; Exchange</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                  Chat via WhatsApp or in-app messaging, meet safely on campus or town, and complete your trade!
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
