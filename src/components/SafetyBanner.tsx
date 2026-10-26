"use client";

import { ShieldCheck, MapPin } from "lucide-react";

export default function SafetyBanner() {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/80 via-white to-cyan-50/60 dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>VarsMart Campus Safety Guarantee</span>
                <span className="hidden sm:inline-block rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                  Student Verified
                </span>
              </h4>
              <p className="mt-0.5 text-[11px] sm:text-xs text-gray-600 dark:text-slate-300 leading-snug">
                Always meet in open campus spaces (e.g. SRC Union, Central Cafeteria, or Library). Inspect items before making payment.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-blue-700 dark:text-blue-300 bg-white/80 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 shadow-sm border border-blue-100 dark:border-slate-700">
              <MapPin className="h-3 w-3 text-blue-600" />
              <span>Recommended: Campus Hubs</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
