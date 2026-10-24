import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CategoryCard from "@/components/CategoryCard";
import FeaturedListings from "@/components/FeaturedListings";
import { categories } from "@/lib/data";
import {
  ArrowRight,
  ShoppingBag,
  Store,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-white py-10 sm:py-20 border-b border-gray-100">
          <div className="absolute inset-0 bg-[radial-gradient(#2563eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3.5 py-1 text-[11px] sm:text-xs font-bold text-blue-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Student &amp; Town Marketplace &bull; Ho, Volta Region</span>
            </div>

            <h1 className="mx-auto mt-4 sm:mt-6 max-w-4xl text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-gray-900">
              Your Campus &amp; City. <span className="text-blue-600">Your Marketplace.</span>
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-base text-gray-600 leading-relaxed">
              Find student hostels, groceries, salons, gadgets, food, and services across all parts of Ho — from Sokode, Dave, and Trafalgar to Bankoe, Dome, and Ho Central.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-md sm:max-w-none mx-auto">
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
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-xs sm:text-sm font-bold text-gray-800 shadow-sm hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition-all"
              >
                <Store className="h-4 w-4 text-purple-600" />
                <span>Sell on VarsMart</span>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="mx-auto mt-8 sm:mt-12 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4 border-t border-gray-100 pt-6 sm:pt-8">
              <div className="rounded-2xl bg-slate-50/70 p-2.5 sm:p-4">
                <p className="text-lg sm:text-2xl font-black text-gray-900">GHS 0</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500">Free to List</p>
              </div>
              <div className="rounded-2xl bg-blue-50/50 p-2.5 sm:p-4">
                <p className="text-lg sm:text-2xl font-black text-blue-600">3+</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500">Campuses &amp; Hostels</p>
              </div>
              <div className="rounded-2xl bg-slate-50/70 p-2.5 sm:p-4">
                <p className="text-lg sm:text-2xl font-black text-gray-900">100%</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500">Direct WhatsApp</p>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES SECTION */}
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Explore Categories</span>
                <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
                  Popular Categories in Ho
                </h2>
              </div>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 hover:underline"
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

        {/* LIVE CAMPUS LISTINGS & TRUST SECTION */}
        <FeaturedListings />

        {/* HOW IT WORKS */}
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Simple &amp; Safe</span>
              <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
                How VarsMart Works
              </h2>
            </div>

            <div className="mt-8 grid gap-3 sm:gap-6 sm:grid-cols-3 text-center">
              <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-600">
                  1
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">Create an Account</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  Join with your student email as a Customer or register your student business in under 60 seconds.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-purple-50 text-lg font-black text-purple-600">
                  2
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">Browse or List Items</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                  Find deals by category and Ho location, or post your items with price in Ghana Cedis.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
                <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-600">
                  3
                </span>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">Connect &amp; Exchange</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
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
