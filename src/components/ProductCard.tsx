/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import {
  MapPin,
  Phone,
  PhoneCall,
  MessageSquare,
  Store,
  FileText,
  Heart,
  ChevronLeft,
  ChevronRight,
  Share2,
  CheckCircle,
} from "lucide-react";
import { categories, getCategoryIcon } from "@/lib/data";
import { getListingImageUrl } from "@/lib/storage";
import { parseSellerPhones, createWhatsAppUrl, createCallUrl } from "@/lib/whatsapp";
import { useWishlist } from "@/lib/useWishlist";

export interface ProductItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price_ghs: number;
  price_max_ghs?: number | null;
  price_type?: "fixed" | "range";
  listing_type?: "product" | "flyer";
  gallery_images?: string[] | null;
  location: string;
  seller_id?: string;
  image_path?: string | null;
  contact_phone?: string | null;
  created_at?: string;
  profiles?: {
    display_name: string;
    business_name?: string | null;
    phone_number?: string | null;
    campus_location?: string | null;
    subscription_status?: string | null;
    subscription_expires_at?: string | null;
  } | null;
}

interface ProductCardProps {
  product: ProductItem;
  onInquire?: (product: ProductItem) => void;
}

export default function ProductCard({ product, onInquire }: ProductCardProps) {
  const categoryObj = categories.find((c) => c.id === product.category);
  const CategoryIcon = getCategoryIcon(product.category);
  const sellerName = product.profiles?.business_name || product.profiles?.display_name || "Vendor";
  const [imageError, setImageError] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const isFlyer = product.listing_type === "flyer";

  // Build full array of valid images
  const allImagePaths = [product.image_path, ...(product.gallery_images || [])].filter(
    Boolean
  ) as string[];
  const totalImages = allImagePaths.length;
  const currentImageUrl =
    totalImages > 0 ? getListingImageUrl(allImagePaths[activeImageIdx]) : null;

  // Format price display (single vs range)
  const isRange =
    product.price_type === "range" ||
    (product.price_max_ghs && product.price_max_ghs > product.price_ghs);
  const priceDisplay = isRange
    ? `${Number(product.price_ghs).toFixed(0)} - ${Number(product.price_max_ghs).toFixed(0)}`
    : Number(product.price_ghs).toFixed(2);

  const whatsAppMessage = isFlyer
    ? `Hello ${sellerName}, I saw your promotional flyer "${product.title}" on VarsMart. I would like to find out more details!`
    : `Hello ${sellerName}, I saw your product "${product.title}" (GHS ${priceDisplay}) on VarsMart. Is it still available?`;

  const phones = parseSellerPhones(product.contact_phone, product.profiles?.phone_number);
  const whatsAppUrl = createWhatsAppUrl(phones.whatsappPhone, whatsAppMessage);
  const callUrl = createCallUrl(phones.callPhone);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % totalImages);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + totalImages) % totalImages);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `Check out "${product.title}" on VarsMart (GHS ${priceDisplay}): https://uhasmartlive.vercel.app/marketplace?query=${encodeURIComponent(
      product.title
    )}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: product.title,
        text: shareText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-gray-100/90 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 p-2.5 sm:p-4 shadow-sm transition-all duration-300 hover:border-blue-300/80 hover:-translate-y-1 hover:shadow-xl dark:hover:border-blue-500/50">
      {/* Clickable Card Body */}
      <div
        onClick={() => onInquire?.(product)}
        className="cursor-pointer select-none"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onInquire?.(product);
          }
        }}
      >
        {/* Product Photo with Floating Badges & Controls */}
        <div className="relative mb-2.5 sm:mb-3 aspect-square w-full overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800">
          {currentImageUrl && !imageError ? (
            <img
              src={currentImageUrl}
              alt={product.title}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-gray-400">
              <CategoryIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300 dark:text-slate-600" />
              <span className="mt-1 text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-slate-500">
                {categoryObj?.name ?? "Item"}
              </span>
            </div>
          )}

          {/* Floating Category Pill */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            <span className="glass-pill inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-gray-800 dark:text-slate-200 shadow-sm backdrop-blur-md">
              <CategoryIcon className="h-3 w-3 text-blue-600 shrink-0" />
              <span className="truncate max-w-[75px] sm:max-w-[105px]">
                {categoryObj?.name ?? product.category}
              </span>
            </span>

            {/* Flyer Badge */}
            {isFlyer && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-600/90 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm backdrop-blur-md">
                <FileText className="h-2.5 w-2.5" />
                <span>Flyer</span>
              </span>
            )}
          </div>

          {/* Floating Action Icons: Wishlist Heart & WhatsApp Indicator */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
            {/* Wishlist Heart Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 shadow-sm backdrop-blur-md active:scale-90 ${
                wishlisted
                  ? "bg-rose-500 text-white shadow-rose-500/30 scale-105"
                  : "glass-pill text-gray-600 dark:text-slate-300 hover:text-rose-500 hover:bg-white"
              }`}
              title={wishlisted ? "Remove from saved" : "Save to wishlist"}
              aria-label="Wishlist toggle"
            >
              <Heart
                className={`h-3.5 w-3.5 transition-transform ${
                  wishlisted ? "fill-current scale-110" : ""
                }`}
              />
            </button>

            {/* Quick Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex h-7 w-7 items-center justify-center rounded-full glass-pill text-gray-600 dark:text-slate-300 hover:text-blue-600 hover:bg-white transition-all shadow-sm backdrop-blur-md active:scale-90"
              title="Share deal"
              aria-label="Share listing"
            >
              {copiedShare ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Share2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Multi-Image Navigation Dots & Subtle Controls */}
          {totalImages > 1 && (
            <>
              {/* Prev / Next buttons visible on hover */}
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 backdrop-blur-sm"
                aria-label="Next image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Indicator Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 backdrop-blur-md">
                {allImagePaths.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeImageIdx
                        ? "w-3 bg-white"
                        : "w-1.5 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Price & Verified Student Badge */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400">GHS</span>
            <span className="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
              {priceDisplay}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-1 text-xs sm:text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {product.title}
        </h3>

        {/* Location & Seller Info */}
        <div className="mt-1 flex items-center justify-between gap-1 text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
          <span className="flex items-center gap-1 truncate max-w-[55%]">
            <MapPin className="h-3 w-3 text-gray-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{product.location}</span>
          </span>
          <span className="flex items-center gap-1 truncate max-w-[45%] font-medium text-gray-600 dark:text-slate-300">
            <Store className="h-3 w-3 text-blue-500 shrink-0" />
            <span className="truncate">{sellerName}</span>
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="mt-3 flex items-center gap-1.5 sm:gap-2 border-t border-gray-100 dark:border-slate-800 pt-2.5 sm:pt-3">
        {whatsAppUrl && (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl sm:rounded-2xl bg-emerald-600 px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
            title="Chat directly on WhatsApp"
          >
            <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </a>
        )}

        {callUrl && (
          <a
            href={callUrl}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center gap-1 rounded-xl sm:rounded-2xl bg-blue-600 px-2.5 sm:px-3.5 py-2 text-[10px] sm:text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
            title={`Call normal phone line: ${phones.displayCall || phones.callPhone}`}
          >
            <PhoneCall className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span>Call</span>
          </a>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInquire?.(product);
          }}
          className={`${
            !whatsAppUrl && !callUrl ? "w-full" : ""
          } inline-flex items-center justify-center rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 active:scale-95 transition-all`}
          title="View product details & in-app message"
        >
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-600 dark:text-slate-300" />
        </button>
      </div>
    </div>
  );
}
