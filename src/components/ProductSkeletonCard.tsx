"use client";

export default function ProductSkeletonCard() {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-2.5 sm:p-4 shadow-sm">
      <div>
        {/* Photo Placeholder */}
        <div className="relative mb-2.5 sm:mb-3 aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl skeleton-shimmer">
          <div className="absolute top-2 left-2 h-5 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
        </div>

        {/* Price Placeholder */}
        <div className="h-5 w-24 rounded-lg skeleton-shimmer mb-2" />

        {/* Title Placeholder */}
        <div className="h-4 w-3/4 rounded-md skeleton-shimmer mb-1.5" />

        {/* Location & Seller Placeholder */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
          <div className="h-3 w-16 rounded skeleton-shimmer" />
        </div>
      </div>

      {/* Action Buttons Placeholder */}
      <div className="mt-3 flex items-center gap-1.5 sm:gap-2 border-t border-gray-100 dark:border-slate-800 pt-2.5 sm:pt-3">
        <div className="h-8 flex-1 rounded-xl sm:rounded-2xl skeleton-shimmer" />
        <div className="h-8 flex-1 rounded-xl sm:rounded-2xl skeleton-shimmer" />
      </div>
    </div>
  );
}
