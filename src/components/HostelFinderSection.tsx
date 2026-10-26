"use client";

import Link from "next/link";
import {
  Home,
  ArrowRight,
  ShieldCheck,
  Zap,
  Droplets,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function HostelFinderSection() {
  const roomTypes = [
    { label: "Self-Contain Rooms", query: "self-contain", badge: "Most Popular" },
    { label: "Single Rooms", query: "single", badge: "Budget Friendly" },
    { label: "2-in-a-Room Hostels", query: "shared", badge: "Shared" },
    { label: "Executive Apartments", query: "apartment", badge: "Full Amenities" },
  ];

  const popularLocations = [
    { name: "Sokode / Main Campus", query: "sokode" },
    { name: "Trafalgar / Hospital Road", query: "trafalgar" },
    { name: "Dave Campus & Hostels", query: "dave" },
    { name: "HTU / Poly Area", query: "htu-poly" },
  ];

  return (
    <section className="py-10 sm:py-14 bg-gradient-to-b from-white via-slate-50/50 to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border-y border-gray-100 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-10 text-white shadow-xl">
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <span>Campus Accommodation Portal</span>
            </div>

            <h2 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-white">
              Find Verified Student Hostels &amp; Rooms in Ho
            </h2>

            <p className="mt-2 text-xs sm:text-base text-blue-100 leading-relaxed max-w-2xl">
              Connect directly with verified hostel managers and student landlords. Filter by room type, water reliability, standby generator, and walking distance to campus.
            </p>

            {/* Room Type Quick Chips */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {roomTypes.map((rt) => (
                <Link
                  key={rt.query}
                  href={`/marketplace?category=hostels&query=${encodeURIComponent(rt.query)}`}
                  className="group inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition-all active:scale-95"
                >
                  <Home className="h-3.5 w-3.5 text-cyan-300" />
                  <span>{rt.label}</span>
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold text-white/90">
                    {rt.badge}
                  </span>
                </Link>
              ))}
            </div>

            {/* Popular Campus Locations */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-blue-100">
              <span className="font-semibold text-cyan-200 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Locations:
              </span>
              {popularLocations.map((loc) => (
                <Link
                  key={loc.query}
                  href={`/marketplace?category=hostels&location=${loc.query}`}
                  className="rounded-lg bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/40 transition-colors"
                >
                  {loc.name}
                </Link>
              ))}
            </div>

            {/* Hostel Amenities Highlights */}
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-white/15 pt-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                  <Droplets className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="text-[11px]">
                  <p className="font-bold">24/7 Water</p>
                  <p className="text-blue-200 text-[10px]">Polytank backups</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                  <Zap className="h-4 w-4 text-yellow-300" />
                </div>
                <div className="text-[11px]">
                  <p className="font-bold">Standby Light</p>
                  <p className="text-blue-200 text-[10px]">Plant / Generator</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="text-[11px]">
                  <p className="font-bold">Gated &amp; Fenced</p>
                  <p className="text-blue-200 text-[10px]">24hr Security</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
                  <MapPin className="h-4 w-4 text-rose-300" />
                </div>
                <div className="text-[11px]">
                  <p className="font-bold">Campus Proximity</p>
                  <p className="text-blue-200 text-[10px]">5-15 mins walk</p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8">
              <Link
                href="/marketplace?category=hostels"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs sm:text-sm font-black text-blue-700 shadow-lg shadow-black/10 hover:bg-blue-50 active:scale-95 transition-all"
              >
                <span>Browse All Available Hostels</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
