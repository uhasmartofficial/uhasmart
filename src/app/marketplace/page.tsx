import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MarketplaceView from "@/components/MarketplaceView";
import ProductSkeletonCard from "@/components/ProductSkeletonCard";

function MarketplaceLoading() {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-8">
      <div className="h-8 w-48 rounded-xl skeleton-shimmer mb-4" />
      <div className="h-14 w-full rounded-3xl skeleton-shimmer mb-6" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <ProductSkeletonCard key={n} />
        ))}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />

      <main className="flex-1">
        <Suspense fallback={<MarketplaceLoading />}>
          <MarketplaceView />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
