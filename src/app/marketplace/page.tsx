/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard, { ProductItem } from "@/components/ProductCard";
import { categories, campusLocations, getCategoryIcon } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { getListingImageUrl } from "@/lib/storage";
import {
  Search,
  MapPin,
  Package,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  Phone,
  MessageSquare,
  Store,
  ChevronDown,
  ShieldCheck,
  Images,
  FileText,
} from "lucide-react";
import { createWhatsAppUrl } from "@/lib/whatsapp";

function MarketplaceInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");

  // Sync category from URL search params (e.g., from Homepage category links)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  // Product Details & Inquiry Bottom Sheet
  const [inquireProduct, setInquireProduct] = useState<ProductItem | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [inquiryBody, setInquiryBody] = useState("");
  const [showInAppForm, setShowInAppForm] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [inquiryNotice, setInquiryNotice] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const [sheetImgError, setSheetImgError] = useState(false);

  useEffect(() => {
    async function loadMarketplace() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("listings")
          .select("id,title,description,category,price_ghs,price_max_ghs,price_type,listing_type,gallery_images,contact_phone,location,seller_id,image_path,created_at,profiles(display_name,business_name,phone_number,campus_location,subscription_status,subscription_expires_at,trial_ends_at,created_at)")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setListings(data as unknown as ProductItem[]);
        }
      } catch (err) {
        console.error("Error loading listings:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadMarketplace();
  }, [supabase]);

  // Helper: check if seller subscription or 30-day trial is currently valid
  // (Expired subscriptions are kept saved in database but hidden from buyers)
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
      return true; // default 30-day trial active
    }

    return expiryDate.getTime() > Date.now();
  };

  // Filtered & sorted products (excluding expired sellers from buyers)
  const filteredProducts = useMemo(() => {
    return listings
      .filter((item) => {
        // Hide if seller's subscription has expired
        if (!isSellerActive(item)) return false;

        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        const matchesLocation = selectedLocation === "all" || item.location === selectedLocation;
        const matchesSearch =
          !searchQuery.trim() ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.profiles?.business_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesLocation && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return Number(a.price_ghs) - Number(b.price_ghs);
        if (sortBy === "price-high") return Number(b.price_ghs) - Number(a.price_ghs);
        return 0;
      });
  }, [listings, selectedCategory, selectedLocation, searchQuery, sortBy]);

  async function handleSendInquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !inquireProduct) return;

    setSendingInquiry(true);
    setInquiryNotice("");
    setInquiryError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        throw new Error("You must sign in to message sellers directly. Please click Sign In in the menu.");
      }

      if (authData.user.id === inquireProduct.seller_id) {
        throw new Error("You cannot send an inquiry on your own product.");
      }

      // Create inquiry or find existing
      const { data: inqData, error: inqErr } = await supabase
        .from("inquiries")
        .upsert({
          listing_id: inquireProduct.id,
          buyer_id: authData.user.id,
          seller_id: inquireProduct.seller_id,
        })
        .select()
        .single();

      if (inqErr) throw inqErr;

      // Add message
      const { error: msgErr } = await supabase.from("inquiry_messages").insert({
        inquiry_id: inqData.id,
        sender_id: authData.user.id,
        body: inquiryBody.trim(),
      });

      if (msgErr) throw msgErr;

      setInquiryNotice("Inquiry sent to the seller! You can continue the chat in the Messages tab.");
      setInquiryBody("");
      setTimeout(() => {
        setInquireProduct(null);
        setInquiryNotice("");
      }, 2200);
    } catch (err) {
      setInquiryError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSendingInquiry(false);
    }
  }

  // Pre-calculate modal product details
  const modalSellerName =
    inquireProduct?.profiles?.business_name || inquireProduct?.profiles?.display_name || "Campus Vendor";
  const modalSellerPhone = inquireProduct?.contact_phone || inquireProduct?.profiles?.phone_number;

  // Gallery array
  const galleryPhotos = inquireProduct?.gallery_images && inquireProduct.gallery_images.length > 0
    ? inquireProduct.gallery_images
    : inquireProduct?.image_path
    ? [inquireProduct.image_path]
    : [];

  const activePhotoPath = galleryPhotos[activeGalleryIndex] || inquireProduct?.image_path;
  const modalImageUrl = activePhotoPath ? getListingImageUrl(activePhotoPath) : null;
  const ModalCategoryIcon = inquireProduct ? getCategoryIcon(inquireProduct.category) : Package;
  const modalCategoryObj = inquireProduct ? categories.find((c) => c.id === inquireProduct.category) : null;

  const isFlyer = inquireProduct?.listing_type === "flyer";
  const isRange =
    inquireProduct?.price_type === "range" ||
    (inquireProduct?.price_max_ghs && inquireProduct.price_max_ghs > inquireProduct.price_ghs);

  const priceDisplay = inquireProduct
    ? isRange
      ? `${Number(inquireProduct.price_ghs).toFixed(0)} - ${Number(inquireProduct.price_max_ghs).toFixed(0)}`
      : Number(inquireProduct.price_ghs).toFixed(2)
    : "0.00";

  const modalWhatsAppMessage = isFlyer
    ? `Hello ${modalSellerName}, I saw your promotional flyer "${inquireProduct?.title}" on VarsMart. I would like to find out more details!`
    : `Hello ${modalSellerName}, I saw your listing "${inquireProduct?.title}" (GHS ${priceDisplay}) on VarsMart. Is it still available?`;

  const modalWhatsAppUrl = inquireProduct ? createWhatsAppUrl(modalSellerPhone, modalWhatsAppMessage) : null;

  // More items from this same seller
  const moreSellerItems = useMemo(() => {
    if (!inquireProduct) return [];
    return listings
      .filter((item) => item.seller_id === inquireProduct.seller_id && item.id !== inquireProduct.id)
      .slice(0, 4);
  }, [listings, inquireProduct]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          {/* Header */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Ho Marketplace</span>
            <h1 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">Campus &amp; Town Marketplace</h1>
            <p className="mt-1 text-xs text-gray-500">
              Hostels, salons, groceries, gadgets, thrift fashion, promotional flyers &amp; services in Ho.
            </p>
          </div>

          {/* Search & Filter Bar (iPhone Frosted Glass) */}
          <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-3xl glass-card p-2.5 sm:p-3.5 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hostels, barbers, groceries, gadgets, flyers..."
                className="w-full rounded-2xl border border-gray-200/80 bg-white/70 py-2.5 pl-10 pr-4 text-xs font-medium text-gray-900 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full sm:w-auto rounded-2xl border border-gray-200/80 bg-white/70 py-2.5 pl-8 pr-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                >
                  <option value="all">All Ho Locations</option>
                  {campusLocations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="flex-1 sm:flex-initial rounded-2xl border border-gray-200/80 bg-white/70 px-3 py-2.5 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Category Tabs (Horizontal Swipe on Mobile with Glass Pills) */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "glass-pill text-gray-700 hover:bg-white"
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={`rounded-2xl px-3.5 py-2 text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    selectedCategory === c.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "glass-pill text-gray-700 hover:bg-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Product Grid - 2 COLUMNS ON MOBILE, 3-4 ON DESKTOP */}
          <div className="mt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-xs font-semibold text-gray-500">Loading marketplace items...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-3 text-base font-bold text-gray-900">No active products or flyers found</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Try adjusting your search query or location filter, or be the first seller to list here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onInquire={(item) => {
                      setInquireProduct(item);
                      setActiveGalleryIndex(0);
                      setShowInAppForm(false);
                      setSheetImgError(false);
                      setInquiryNotice("");
                      setInquiryError("");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Upgraded iOS Product Details & Gallery Bottom Sheet */}
      {inquireProduct && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setInquireProduct(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* iOS Pull Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2 space-y-4">
              {/* Header with Badges & Close Button */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ModalCategoryIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-gray-700">
                    {modalCategoryObj?.name ?? inquireProduct.category}
                  </span>
                  {isFlyer && (
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-black uppercase">
                      Flyer
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setInquireProduct(null)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 active:scale-95 transition-all"
                  aria-label="Close details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Showcase Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100 shadow-inner">
                {modalImageUrl && !sheetImgError ? (
                  <img
                    src={modalImageUrl}
                    alt={inquireProduct.title}
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

                {/* Floating Price Tag */}
                <div className="absolute bottom-3 left-3">
                  <div className="glass-pill inline-flex items-baseline gap-1 rounded-2xl px-3 py-1.5 shadow-lg backdrop-blur-md">
                    <span className="text-xs font-bold text-blue-600">GHS</span>
                    <span className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                      {priceDisplay}
                    </span>
                  </div>
                </div>

                {/* Photo Index Indicator */}
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

              {/* PRODUCT GALLERY THUMBNAIL STRIP (Requirement 4) */}
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

              {/* Title & Location */}
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 leading-snug">
                  {inquireProduct.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-gray-700">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    <span>{inquireProduct.location}</span>
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

              {/* Description */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  {isFlyer ? "Flyer / Promotion Details" : "Product Description"}
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {inquireProduct.description || "No additional description provided by the seller."}
                </p>
              </div>

              {/* Seller Information Card */}
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
                      {inquireProduct.profiles?.campus_location || inquireProduct.location} &bull; Campus Vendor
                    </p>
                  </div>
                </div>
              </div>

              {/* MORE FROM THIS SELLER MINI GALLERY */}
              {moreSellerItems.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-800">More from this Seller</p>
                  <div className="grid grid-cols-2 gap-2">
                    {moreSellerItems.map((item) => {
                      const itemThumb = getListingImageUrl(item.image_path);
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setInquireProduct(item);
                            setActiveGalleryIndex(0);
                          }}
                          className="flex items-center gap-2 rounded-xl border border-gray-100 bg-slate-50 p-2 cursor-pointer hover:bg-white hover:border-blue-200 transition-all active:scale-95"
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                            {itemThumb && <img src={itemThumb} alt={item.title} className="h-full w-full object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-gray-900 truncate">{item.title}</p>
                            <p className="text-[10px] font-extrabold text-blue-600">
                              GHS {Number(item.price_ghs).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Primary Direct WhatsApp CTA */}
              {modalWhatsAppUrl ? (
                <div className="space-y-2 pt-2">
                  <a
                    href={modalWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-98 transition-all"
                  >
                    <Phone className="h-5 w-5" />
                    <span>{isFlyer ? "Inquire on WhatsApp Directly" : "Chat with Seller on WhatsApp"}</span>
                  </a>
                  <p className="text-center text-[11px] text-gray-400">
                    Instant contact for fastest delivery or inspection in Ho
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800">
                  Seller has not attached a public WhatsApp line. Please use in-app messaging below.
                </div>
              )}

              {/* Collapsible / In-App Messaging Toggle */}
              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInAppForm(!showInAppForm)}
                  className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span>Send In-App Message on VarsMart</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${
                      showInAppForm ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showInAppForm && (
                  <form onSubmit={handleSendInquiry} className="mt-3 space-y-3 animate-in fade-in duration-200">
                    {inquiryNotice && (
                      <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-bold text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{inquiryNotice}</span>
                      </div>
                    )}
                    {inquiryError && (
                      <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{inquiryError}</span>
                      </div>
                    )}

                    <div>
                      <textarea
                        required
                        rows={3}
                        value={inquiryBody}
                        onChange={(e) => setInquiryBody(e.target.value)}
                        placeholder={`Hi ${modalSellerName}, is this available? Where in Ho can we meet?`}
                        className="w-full rounded-xl border border-gray-300 p-3 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingInquiry}
                      className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 active:scale-98 transition-all"
                    >
                      {sendingInquiry ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-xs font-bold text-gray-500">Loading Ho Marketplace...</p>
        </div>
      }
    >
      <MarketplaceInner />
    </Suspense>
  );
}
