"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Flame } from "lucide-react";
import { campusLocations } from "@/lib/data";

export default function HeroSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("all");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (location && location !== "all") params.set("location", location);
    router.push(`/marketplace?${params.toString()}`);
  };

  const trendingSearches = [
    { label: "Hostels in Sokode", category: "hostels", query: "sokode", icon: "🏠" },
    { label: "iPhones & Laptops", category: "electronics", icon: "📱" },
    { label: "Campus Food & Chops", category: "food", icon: "🍔" },
    { label: "Textbooks & Notes", category: "academic-services", icon: "📚" },
    { label: "Fashion & Thrift", category: "fashion", icon: "👗" },
    { label: "Salons & Barbers", category: "salons-barbers", icon: "✂️" },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 sm:mt-8">
      {/* Floating Modern Search Container */}
      <form
        onSubmit={handleSearch}
        className="relative flex flex-col sm:flex-row items-stretch gap-2 rounded-3xl bg-white/95 dark:bg-slate-900/90 p-2 sm:p-2.5 shadow-2xl shadow-blue-900/10 dark:shadow-black/40 border border-blue-200/80 dark:border-slate-800 backdrop-blur-xl"
      >
        {/* Keyword Search Input */}
        <div className="relative flex-1 flex items-center pl-3">
          <Search className="h-4 w-4 text-gray-400 dark:text-slate-500 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search hostels, iPhone, textbooks, calculators, food..."
            className="w-full bg-transparent px-2.5 py-2.5 text-xs sm:text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mr-2 text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              &times;
            </button>
          )}
        </div>

        {/* Location Dropdown */}
        <div className="relative flex items-center border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-slate-800 pl-3 pr-2 py-1 sm:py-0">
          <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="bg-transparent pl-2 pr-6 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all" className="dark:bg-slate-900 dark:text-white">
              All Campus Areas
            </option>
            {campusLocations.map((loc) => (
              <option key={loc.id} value={loc.id} className="dark:bg-slate-900 dark:text-white">
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Search Button */}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>
      </form>

      {/* Trending Search Chips */}
      <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-slate-400">
          <Flame className="h-3.5 w-3.5 text-amber-500" />
          <span>Trending:</span>
        </span>
        {trendingSearches.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (item.category) params.set("category", item.category);
              if (item.query) params.set("query", item.query);
              router.push(`/marketplace?${params.toString()}`);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-slate-300 shadow-sm hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 transition-all"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
