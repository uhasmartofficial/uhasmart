/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ProductCard, { ProductItem } from "@/components/ProductCard";
import ProductSkeletonCard from "@/components/ProductSkeletonCard";
import {
  ArrowRight,
  Store,
  ShieldCheck,
  MessageSquare,
  MapPin,
  Sparkles,
  Phone,
  PhoneCall,
  X,
  Package,
  Images,
  FileText,
} from "lucide-react";
import { getListingImageUrl } from "@/lib/storage";
import { categories, getCategoryIcon } from "@/lib/data";
import { createWhatsAppUrl, createCallUrl, parseSellerPhones } from "@/lib/whatsapp";

export default function FeaturedListings() {
  const supabase = createClient();
  const [listings, setListings] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [sheetImgError, setSheetImgError] = useState(false);

  useEffect(() => {
    async function loadRecent() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id,title,description,category,price_ghs,price_max_ghs,price_type,listing_type,gallery_images,contact_phone,location,seller_id,image_path,created_at,profiles(display_name,business_name,phone_number,campus_location,subscription_status,subscription_expires_at,trial_ends_at,created_at)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(12);

        if (!error && data) {
          setListings(data as unknown as ProductItem[]);
        }
      } catch (err) {
        console.error("Failed to load featured items:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadRecent();
  }, [supabase]);

  // Hide listings if seller's subscription has expired
  const isSellerActive = (item: ProductItem): boolean => {
    if (!item.profiles) return true;
    const prof = item.profiles as {
      subscription_expires_at?: string | null;
      trial_ends_at?: string | null;
      created_at?: string | null;
    };
    let expiryDate: Date;
    if (prof.subscription_expires_at) {
      expiryDate = new Date(prof.subscription_expires_at);
    } else if (prof.trial_ends_at) {
      expiryDate = new Date(prof.trial_ends_at);
    } else if (prof.created_at) {
      expiryDate = new Date(new Date(prof.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      return true;
    }
    return expiryDate.getTime() > Date.now();
  };

  const activeListings = useMemo(() => {
    return listings.filter(isSellerActive).slice(0, 4);
  }, [listings]);

  // Modal details
  const modalSellerName =
    selectedProduct?.profiles?.business_name || selectedProduct?.profiles?.display_name || "Campus Vendor";

  const sellerPhones = useMemo(() => {
    return parseSellerPhones(
      selectedProduct?.contact_phone,
      selectedProduct?.profiles?.phone_number
    );
  }, [selectedProduct]);

  const galleryPhotos = selectedProduct?.gallery_images && selectedProduct.gallery_images.length > 0
    ? selectedProduct.gallery_images
    : selectedProduct?.image_path
    ? [selectedProduct.image_path]
    : [];

  const activePhotoPath = galleryPhotos[activeGalleryIndex] || selectedProduct?.image_path;
  const modalImageUrl = activePhotoPath ? getListingImageUrl(activePhotoPath) : null;
  const ModalCategoryIcon = selectedProduct ? getCategoryIcon(selectedProduct.category) : Package;
  const modalCategoryObj = selectedProduct ? categories.find((c) => c.id === selectedProduct.category) : null;

  const isFlyer = selectedProduct?.listing_type === "flyer";
  const isRange =
    selectedProduct?.price_type === "range" ||
    (selectedProduct?.price_max_ghs && selectedProduct.price_max_ghs > selectedProduct.price_ghs);

  const priceDisplay = selectedProduct
    ? isRange
      ? `${Number(selectedProduct.price_ghs).toFixed(0)} - ${Number(selectedProduct.price_max_ghs).toFixed(0)}`
      : Number(selectedProduct.price_ghs).toFixed(2)
    : "0.00";

  const modalWhatsAppMessage = isFlyer
    ? `Hello ${modalSellerName}, I saw your promotional flyer "${selectedProduct?.title}" on VarsMart. I would like to find out more details!`
    : `Hello ${modalSellerName}, I saw your listing "${selectedProduct?.title}" (GHS ${priceDisplay}) on VarsMart. Is it still available?`;

  const modalWhatsAppUrl = selectedProduct && sellerPhones.whatsappPhone
    ? createWhatsAppUrl(sellerPhones.whatsappPhone, modalWhatsAppMessage)
    : null;

  const modalCallUrl = selectedProduct && sellerPhones.callPhone
    ? createCallUrl(sellerPhones.callPhone)
    : null;

  return (
    <section className="bg-white py-10 sm:py-16 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Live Ho Marketplace</span>
            <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
              Recent Listings in Ho
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Verified items, hostels, promotional flyers &amp; services in Sokode, Dave, Trafalgar, Bankoe &amp; Dome.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600 hover:underline"
          >
            <span>Browse all items</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <ProductSkeletonCard key={n} />
            ))}
          </div>
        ) : activeListings.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {activeListings.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onInquire={(p) => {
                  setSelectedProduct(p);
                  setActiveGalleryIndex(0);
                  setSheetImgError(false);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-dashed border-gray-200 bg-slate-50/70 p-6 sm:p-12 text-center">
            <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
              <Store className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">Be the first to list on VarsMart</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-gray-500">
              Upload up to 20 product pictures at once or post a promotional flyer. Start receiving direct inquiries on WhatsApp!
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/seller"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Store className="h-3.5 w-3.5" />
                <span>Start Selling</span>
              </Link>
              <Link
                href="/register-business"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <span>Register Student Brand</span>
              </Link>
            </div>
          </div>
        )}

        {/* Value props grid */}
        <div className="mt-12 sm:mt-16 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-xs sm:text-sm font-bold text-gray-900">Verified Students</h4>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-500 line-clamp-2">
              Transactions are between verified students and campus sellers.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-xs sm:text-sm font-bold text-gray-900">Direct WhatsApp</h4>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-500 line-clamp-2">
              Chat directly with sellers without middlemen or transaction charges.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <MapPin className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-xs sm:text-sm font-bold text-gray-900">Campus Meetups</h4>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-500 line-clamp-2">
              Fast, safe pickups at Sokode, Trafalgar, or Dave campus hostels.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-slate-50/50 p-4 sm:p-5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="mt-3 text-xs sm:text-sm font-bold text-gray-900">30 Days Free Trial</h4>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-500 line-clamp-2">
              Every seller gets 30 days free. Keep 100% of your product sales.
            </p>
          </div>
        </div>
      </div>

      {/* Product Details & Gallery Bottom Sheet */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Pull Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ModalCategoryIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {modalCategoryObj?.name ?? selectedProduct.category}
                  </span>
                  {isFlyer && (
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-black uppercase">
                      Flyer
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Showcase Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-inner">
                {modalImageUrl && !sheetImgError ? (
                  <img
                    src={modalImageUrl}
                    alt={selectedProduct.title}
                    onError={() => setSheetImgError(true)}
                    className="h-full w-full object-cover transition-all duration-200"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-gray-400">
                    <ModalCategoryIcon className="h-12 w-12 text-gray-300" />
                    <span className="mt-2 text-xs font-semibold text-gray-400">
                      {modalCategoryObj?.name ?? "Campus Item"}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3">
                  <div className="glass-pill inline-flex items-baseline gap-1 rounded-2xl px-3 py-1.5 shadow-lg backdrop-blur-md">
                    <span className="text-xs font-bold text-blue-600">GHS</span>
                    <span className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                      {priceDisplay}
                    </span>
                  </div>
                </div>

                {galleryPhotos.length > 1 && (
                  <div className="absolute top-3 right-3">
                    <span className="glass-pill inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-gray-800 shadow-md backdrop-blur-md">
                      <Images className="h-3 w-3 text-blue-600" />
                      <span>
                        {activeGalleryIndex + 1} / {galleryPhotos.length}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Product Gallery Thumbnail Strip */}
              {galleryPhotos.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                    <span>Product Gallery ({galleryPhotos.length} pictures)</span>
                    <span className="text-[10px] text-blue-600 font-semibold">Tap to view photo</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                    {galleryPhotos.map((photoPath, idx) => {
                      const thumbUrl = getListingImageUrl(photoPath);
                      const isSelected = activeGalleryIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveGalleryIndex(idx)}
                          className={`relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-600/30 scale-105"
                              : "border-gray-200 opacity-70 hover:opacity-100"
                          }`}
                        >
                          {thumbUrl ? (
                            <img src={thumbUrl} alt={`Thumbnail ${idx}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-slate-200" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-snug">
                  {selectedProduct.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-gray-700">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    <span>{selectedProduct.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Student Verified</span>
                  </span>
                  {isFlyer && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 font-semibold text-purple-700">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Promotional Flyer</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {isFlyer ? "Flyer / Promotion Details" : "Item Description"}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedProduct.description || "No additional description provided by the seller."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold text-base shadow-sm">
                    {modalSellerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      <p className="font-bold text-sm text-gray-900 truncate">{modalSellerName}</p>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {selectedProduct.profiles?.campus_location || selectedProduct.location} &bull; Campus Vendor
                    </p>
                  </div>
                </div>

                {/* Seller Phone Numbers */}
                {(sellerPhones.displayWhatsapp || sellerPhones.displayCall) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    {sellerPhones.displayWhatsapp && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <Phone className="h-3 w-3" />
                        <span>WA: {sellerPhones.displayWhatsapp}</span>
                      </span>
                    )}
                    {sellerPhones.displayCall && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        <PhoneCall className="h-3 w-3" />
                        <span>Call: {sellerPhones.displayCall}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Primary Direct CTAs */}
              {modalWhatsAppUrl || modalCallUrl ? (
                <div className="space-y-2">
                  <div className={`grid ${modalWhatsAppUrl && modalCallUrl ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-2`}>
                    {modalWhatsAppUrl && (
                      <a
                        href={modalWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-98 transition-all"
                      >
                        <Phone className="h-4 w-4" />
                        <span>{isFlyer ? "Inquire on WhatsApp" : "Chat on WhatsApp"}</span>
                      </a>
                    )}
                    {modalCallUrl && (
                      <a
                        href={modalCallUrl}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-98 transition-all"
                      >
                        <PhoneCall className="h-4 w-4" />
                        <span>Call Normal Phone</span>
                      </a>
                    )}
                  </div>
                  <p className="text-center text-[11px] text-gray-400">
                    Can&apos;t reach on WhatsApp? Tap &quot;Call Normal Phone&quot; to ring directly.
                  </p>
                </div>
              ) : null}

              <Link
                href="/marketplace"
                className="block text-center rounded-xl border border-gray-200 bg-slate-50 py-2.5 text-xs font-bold text-gray-700 hover:bg-slate-100"
              >
                View Full Marketplace &amp; Message in App
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
