/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { categories, campusLocations } from "@/lib/data";
import { getListingImageUrl } from "@/lib/storage";
import RegisterBusinessUpgrade from "@/components/RegisterBusinessUpgrade";
import SubscriptionModal from "@/components/SubscriptionModal";
import { getSubscriptionState, SubscriptionState } from "@/lib/subscriptions";
import {
  Store,
  PlusCircle,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Tag,
  Loader2,
  X,
  UploadCloud,
  MapPin,
  FileText,
  Images,
  Zap,
  Phone,
  Plus,
} from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price_ghs: number;
  price_max_ghs?: number | null;
  price_type?: "fixed" | "range";
  listing_type?: "product" | "flyer";
  gallery_images?: string[] | null;
  contact_phone?: string | null;
  location: string;
  status: "pending" | "active" | "rejected" | "sold" | "withdrawn";
  created_at: string;
  image_path?: string | null;
}

interface ProductItemDraft {
  file: File;
  previewUrl: string;
  title: string;
  priceGhs: string;
}

interface ProfileState {
  display_name: string;
  role: string;
  business_name: string | null;
  phone_number?: string | null;
  campus_location?: string | null;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  subscription_expires_at?: string | null;
  trial_ends_at?: string | null;
  created_at?: string;
}

export default function SellerDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncingPayment, setSyncingPayment] = useState(false);

  // TWO POSTING OPTIONS: "products" (multiple uploads) vs "flyer" (promo flyer)
  const [postingOption, setPostingOption] = useState<"products" | "flyer">("products");

  // SHARED FIELDS
  const [category, setCategory] = useState("food");
  const [location, setLocation] = useState(campusLocations[0].name);
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // OPTION 1: UPLOAD PRODUCTS (Up to 20 pictures)
  const [productDrafts, setProductDrafts] = useState<ProductItemDraft[]>([]);
  const [pricingMode, setPricingMode] = useState<"uniform" | "individual">("uniform");
  const [uniformTitle, setUniformTitle] = useState("");
  const [uniformPriceGhs, setUniformPriceGhs] = useState("");
  const [priceType, setPriceType] = useState<"fixed" | "range">("fixed");
  const [priceMaxGhs, setPriceMaxGhs] = useState("");
  const [multiPhotoPostMode, setMultiPhotoPostMode] = useState<"separate_products" | "single_gallery">("separate_products");

  // OPTION 2: POST A FLYER (Single Promotional Banner)
  const [flyerTitle, setFlyerTitle] = useState("");
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null);
  const [flyerPriceType, setFlyerPriceType] = useState<"fixed" | "range">("fixed");
  const [flyerPriceGhs, setFlyerPriceGhs] = useState("");
  const [flyerPriceMaxGhs, setFlyerPriceMaxGhs] = useState("");

  // Calculate Subscription & Trial State
  const subscriptionState: SubscriptionState = getSubscriptionState(profile);

  const loadSellerData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setLoading(false);
        return;
      }

      setUser(authData.user);

      const [profRes, listRes, payRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,role,business_name,phone_number,campus_location,subscription_status,subscription_expires_at,trial_ends_at,created_at")
          .eq("id", authData.user.id)
          .maybeSingle(),
        supabase
          .from("listings")
          .select("*")
          .eq("seller_id", authData.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscription_payments")
          .select("amount_ghs,plan_name,duration_days,created_at,reference")
          .eq("seller_id", authData.user.id)
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const metaRole = authData.user.user_metadata?.role;
      const metaBizName = authData.user.user_metadata?.business_name;
      const metaPhone = authData.user.user_metadata?.phone_number;
      const metaLocation = authData.user.user_metadata?.campus_location;

      if (profRes.data) {
        const prof = profRes.data as ProfileState;

        // Auto-heal active subscription if user has a verified payment in subscription_payments
        if (payRes.data && payRes.data.created_at) {
          const durationDays = payRes.data.duration_days || 30;
          const payTime = new Date(payRes.data.created_at).getTime();
          const computedExpiry = new Date(payTime + durationDays * 24 * 60 * 60 * 1000);

          if (computedExpiry.getTime() > Date.now() && prof.subscription_status !== "active") {
            prof.subscription_status = "active";
            prof.subscription_tier = payRes.data.plan_name || "Seller Subscription";
            prof.subscription_expires_at = computedExpiry.toISOString();

            void supabase
              .from("profiles")
              .update({
                role: "seller",
                subscription_status: "active",
                subscription_tier: payRes.data.plan_name || "Seller Subscription",
                subscription_expires_at: computedExpiry.toISOString(),
                subscription_reminder_sent: false,
              })
              .eq("id", authData.user.id);
          }
        }

        // If profile is still not marked active, check Paystack API for any recent uncredited transaction
        if (prof.subscription_status !== "active" && authData.user.email) {
          void (async () => {
            try {
              const syncRes = await fetch("/api/payment/paystack/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: authData.user.id, email: authData.user.email }),
              });
              const syncData = await syncRes.json();
              if (syncData.found && syncData.newExpiry) {
                setProfile((prev) =>
                  prev
                    ? {
                        ...prev,
                        subscription_status: "active",
                        subscription_tier: syncData.planName || "Seller Subscription",
                        subscription_expires_at: syncData.newExpiry,
                      }
                    : prev
                );
              }
            } catch (syncErr) {
              console.warn("Paystack sync notice:", syncErr);
            }
          })();
        }

        // If metadata indicates seller but profile table hasn't updated yet, sync and self-heal
        if (metaRole === "seller" && prof.role !== "seller") {
          prof.role = "seller";
          prof.business_name = prof.business_name || metaBizName || "Campus Business";
          prof.phone_number = prof.phone_number || metaPhone || null;
          prof.campus_location = prof.campus_location || metaLocation || campusLocations[0].name;

          void (async () => {
            try {
              const { error: rpcErr } = await supabase.rpc("upgrade_to_seller", {
                p_business_name: prof.business_name,
                p_phone_number: prof.phone_number || "",
                p_campus_location: prof.campus_location || campusLocations[0].name,
              });
              if (rpcErr) {
                await supabase
                  .from("profiles")
                  .update({
                    role: "seller",
                    business_name: prof.business_name,
                    phone_number: prof.phone_number,
                    campus_location: prof.campus_location,
                  })
                  .eq("id", authData.user.id);
              }
            } catch (e) {
              console.warn("Seller dashboard self-heal notice:", e);
            }
          })();
        }

        setProfile(prof);
        if (prof.phone_number) {
          setContactPhone(prof.phone_number);
        }
      } else if (metaRole === "seller") {
        const prof: ProfileState = {
          display_name: authData.user.user_metadata?.display_name || authData.user.email?.split("@")[0] || "Seller",
          role: "seller",
          business_name: metaBizName || "Campus Business",
          phone_number: metaPhone || null,
          campus_location: metaLocation || campusLocations[0].name,
        };
        setProfile(prof);
        if (prof.phone_number) setContactPhone(prof.phone_number);

        void supabase.rpc("upgrade_to_seller", {
          p_business_name: prof.business_name,
          p_phone_number: prof.phone_number || "",
          p_campus_location: prof.campus_location || campusLocations[0].name,
        });
      }
      if (listRes.data) {
        setListings(listRes.data as ListingItem[]);
      }
    } catch (err) {
      console.error("Seller dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadSellerData();
  }, [loadSellerData]);

  // Handle Paystack return callback (e.g. redirected payment on mobile)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const payment = params.get("payment");

    if (ref && (payment === "success" || !payment)) {
      void (async () => {
        try {
          const res = await fetch("/api/payment/paystack/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: ref }),
          });
          const data = await res.json();
          if (data.success) {
            setSuccess("Payment confirmed! Your seller subscription is now active.");
            void loadSellerData();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.warn("Paystack return verification notice:", e);
        }
      })();
    }
  }, [loadSellerData]);

  async function handleSyncPayment() {
    if (!user?.id || !user?.email) return;
    setSyncingPayment(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/payment/paystack/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.found && data.newExpiry) {
        setSuccess(`Payment detected (${data.reference})! Your ${data.planName} subscription is now active.`);
        void loadSellerData();
      } else {
        setError(data.message || "No recent uncredited Paystack payment found for your account.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to Paystack sync service.");
    } finally {
      setSyncingPayment(false);
    }
  }

  // Multiple Image Selection (up to 20 pictures at once)
  function handleMultipleImagesChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 20 - productDrafts.length;
    if (remainingSlots <= 0) {
      setError("You have reached the maximum limit of 20 product pictures.");
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setError(`Only ${remainingSlots} more photo(s) could be added to stay within the 20-photo limit.`);
    } else {
      setError("");
    }

    const newDrafts: ProductItemDraft[] = filesToAdd.map((file, idx) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      title: uniformTitle ? `${uniformTitle} #${productDrafts.length + idx + 1}` : `Item #${productDrafts.length + idx + 1}`,
      priceGhs: uniformPriceGhs || "",
    }));

    setProductDrafts((prev) => [...prev, ...newDrafts]);
  }

  function handleRemoveProductDraft(index: number) {
    setProductDrafts((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  // Flyer Image Selection (1 flyer)
  function handleFlyerChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Flyer image exceeds 8MB. Please choose a smaller file.");
      return;
    }

    setError("");
    setFlyerFile(file);
    setFlyerPreview(URL.createObjectURL(file));
  }

  function handleRemoveFlyer() {
    if (flyerPreview) {
      URL.revokeObjectURL(flyerPreview);
    }
    setFlyerFile(null);
    setFlyerPreview(null);
  }

  // Submit Handler for Both Posting Options
  async function handleCreateListing(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;

    if (profile?.role !== "seller") {
      setError("Please register your student business details before listing products.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // -------------------------------------------------------------
      // SUBMIT FLOW A: POST A PROMOTIONAL FLYER
      // -------------------------------------------------------------
      if (postingOption === "flyer") {
        if (!flyerFile) {
          throw new Error("Please upload a flyer image before submitting.");
        }

        const basePrice = parseFloat(flyerPriceGhs) || 0;
        const maxPrice = flyerPriceType === "range" && flyerPriceMaxGhs ? parseFloat(flyerPriceMaxGhs) : null;

        setUploadProgressText("Uploading promotional flyer image...");
        const fileExt = flyerFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const flyerStoragePath = `${user.id}/flyers/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(flyerStoragePath, flyerFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadErr) throw new Error(`Failed to upload flyer: ${uploadErr.message}`);

        setUploadProgressText("Saving flyer listing to marketplace...");
        const { data: newListing, error: insertErr } = await supabase
          .from("listings")
          .insert({
            seller_id: user.id,
            title: flyerTitle.trim(),
            description: description.trim(),
            category,
            price_ghs: basePrice,
            price_max_ghs: maxPrice,
            price_type: flyerPriceType,
            listing_type: "flyer",
            location,
            contact_phone: contactPhone.trim() || profile.phone_number,
            image_path: flyerStoragePath,
            gallery_images: [flyerStoragePath],
            status: "pending",
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        setListings((prev) => [newListing as ListingItem, ...prev]);
        setSuccess("Promotional flyer submitted! It is awaiting quick approval by campus moderators.");
        setShowCreateModal(false);
        handleRemoveFlyer();
        setFlyerTitle("");
        setDescription("");
        setFlyerPriceGhs("");
        setFlyerPriceMaxGhs("");
        return;
      }

      // -------------------------------------------------------------
      // SUBMIT FLOW B: UPLOAD PRODUCTS (Up to 20 Pictures)
      // -------------------------------------------------------------
      if (productDrafts.length === 0) {
        throw new Error("Please upload at least 1 product picture (up to 20 allowed).");
      }

      // Step 1: Upload all product photos in parallel/batches
      const uploadedPaths: string[] = [];
      for (let i = 0; i < productDrafts.length; i++) {
        setUploadProgressText(`Uploading product photo ${i + 1} of ${productDrafts.length}...`);
        const draft = productDrafts[i];
        const fileExt = draft.file.name.split(".").pop()?.toLowerCase() || "jpg";
        const storagePath = `${user.id}/products/${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, draft.file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadErr) throw new Error(`Failed to upload photo #${i + 1}: ${uploadErr.message}`);
        uploadedPaths.push(storagePath);
      }

      setUploadProgressText("Saving products to marketplace...");

      // Case B1: Post as a single product with a multi-photo gallery
      if (multiPhotoPostMode === "single_gallery" || productDrafts.length === 1) {
        const basePrice = parseFloat(uniformPriceGhs || productDrafts[0].priceGhs);
        if (isNaN(basePrice) || basePrice < 0) {
          throw new Error("Please enter a valid price in Ghana Cedis.");
        }
        const maxPrice = priceType === "range" && priceMaxGhs ? parseFloat(priceMaxGhs) : null;

        const { data: newListing, error: insertErr } = await supabase
          .from("listings")
          .insert({
            seller_id: user.id,
            title: (uniformTitle || productDrafts[0].title).trim(),
            description: description.trim(),
            category,
            price_ghs: basePrice,
            price_max_ghs: maxPrice,
            price_type: priceType,
            listing_type: "product",
            location,
            contact_phone: contactPhone.trim() || profile.phone_number,
            image_path: uploadedPaths[0],
            gallery_images: uploadedPaths,
            status: "pending",
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        setListings((prev) => [newListing as ListingItem, ...prev]);
        setSuccess(`Product with ${uploadedPaths.length} photo(s) submitted successfully for review!`);
      } else {
        // Case B2: Post as multiple individual products in one batch!
        const rowsToInsert = productDrafts.map((draft, idx) => {
          const itemPrice = pricingMode === "individual" ? parseFloat(draft.priceGhs) : parseFloat(uniformPriceGhs);
          const maxPrice = priceType === "range" && priceMaxGhs ? parseFloat(priceMaxGhs) : null;
          const itemTitle = pricingMode === "individual" ? draft.title : `${uniformTitle || "Item"} #${idx + 1}`;

          return {
            seller_id: user.id,
            title: itemTitle.trim(),
            description: description.trim(),
            category,
            price_ghs: isNaN(itemPrice) ? 0 : itemPrice,
            price_max_ghs: maxPrice,
            price_type: priceType,
            listing_type: "product",
            location,
            contact_phone: contactPhone.trim() || profile.phone_number,
            image_path: uploadedPaths[idx],
            gallery_images: uploadedPaths, // each item retains the batch gallery
            status: "pending",
          };
        });

        const { data: insertedRows, error: batchErr } = await supabase
          .from("listings")
          .insert(rowsToInsert)
          .select();

        if (batchErr) throw batchErr;
        if (insertedRows) {
          setListings((prev) => [...(insertedRows as ListingItem[]), ...prev]);
        }
        setSuccess(`Batch upload complete! Successfully listed ${rowsToInsert.length} products for review.`);
      }

      // Cleanup
      productDrafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setProductDrafts([]);
      setUniformTitle("");
      setUniformPriceGhs("");
      setPriceMaxGhs("");
      setDescription("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing.");
    } finally {
      setSubmitting(false);
      setUploadProgressText("");
    }
  }

  async function updateListingStatus(id: string, newStatus: "sold" | "withdrawn" | "active") {
    if (!supabase) return;
    try {
      const { error: updErr } = await supabase.from("listings").update({ status: newStatus }).eq("id", id);
      if (updErr) throw updErr;

      setListings((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item status.");
    }
  }

  async function handleDeleteListing(id: string) {
    if (!supabase || !confirm("Are you sure you want to delete this listing?")) return;
    try {
      const { error: delErr } = await supabase.from("listings").delete().eq("id", id);
      if (delErr) throw delErr;

      setListings((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Listing deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    }
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-xs font-semibold text-gray-500">Loading Seller Portal...</p>
      </div>
    );
  }

  // Case 1: Not logged in
  if (!user) {
    return (
      <div className="w-full max-w-md rounded-3xl glass-card p-8 text-center shadow-lg">
        <Store className="mx-auto h-12 w-12 text-blue-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Sign in to Seller Dashboard</h2>
        <p className="mt-2 text-xs text-gray-500">You must be logged into a seller account to manage products.</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href="/login"
            className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
          >
            Sign in
          </Link>
          <Link
            href="/register-business"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            Register Student Business
          </Link>
        </div>
      </div>
    );
  }

  // Case 2: Logged in as customer -> Must register student business first
  if (profile?.role !== "seller") {
    return (
      <div className="flex w-full justify-center px-2">
        <RegisterBusinessUpgrade
          initialDisplayName={profile?.display_name}
          onSuccess={() => {
            setLoading(true);
            void loadSellerData();
          }}
        />
      </div>
    );
  }

  // Case 3: Registered Seller
  const activeCount = listings.filter((l) => l.status === "active").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const soldCount = listings.filter((l) => l.status === "sold").length;

  return (
    <div className="w-full max-w-5xl space-y-6 px-1 sm:px-0">
      {/* 1. SELLER SUBSCRIPTION & TRIAL STATUS BANNER */}
      <div
        className={`rounded-3xl p-5 sm:p-6 border shadow-sm transition-all ${
          subscriptionState.isExpired
            ? "bg-rose-50/90 border-rose-200"
            : subscriptionState.daysRemaining <= 5
            ? "bg-amber-50/90 border-amber-200"
            : "glass-card border-blue-100"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm shrink-0 ${
                subscriptionState.isExpired
                  ? "bg-rose-600"
                  : subscriptionState.daysRemaining <= 5
                  ? "bg-amber-600"
                  : "bg-blue-600"
              }`}
            >
              <Zap className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    subscriptionState.isExpired
                      ? "bg-rose-100 text-rose-800"
                      : subscriptionState.daysRemaining <= 5
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {subscriptionState.isExpired
                    ? "Subscription Expired"
                    : subscriptionState.isTrial
                    ? "30-Day Free Trial"
                    : `Active Subscription • ${profile?.subscription_tier || "Standard"}`}
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {subscriptionState.isExpired
                    ? "Products currently hidden from buyers"
                    : `${subscriptionState.daysRemaining} days remaining (Expires ${subscriptionState.formattedExpiry})`}
                </span>
              </div>

              <h2 className="mt-1 text-base sm:text-lg font-black text-gray-900">
                {subscriptionState.isExpired
                  ? "Reactivate Your Listings with Mobile Money"
                  : subscriptionState.isTrial
                  ? `Enjoying UHASMART? ${subscriptionState.daysRemaining} days left in your free trial`
                  : `Active ${profile?.subscription_tier || "Seller"} Plan • Ready for student buyers`}
              </h2>

              <p className="mt-0.5 text-xs text-gray-600 max-w-xl leading-relaxed">
                {subscriptionState.isExpired
                  ? "Your products are saved safely, but buyers cannot view or purchase them until subscription is renewed."
                  : "Automatic reminders keep your listings live. Renew anytime using MTN MoMo, Telecel Cash, or AT Money."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleSyncPayment}
              disabled={syncingPayment}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              title="Sync latest Paystack payment"
            >
              <Loader2 className={`h-3.5 w-3.5 text-gray-500 ${syncingPayment ? "animate-spin" : ""}`} />
              <span>{syncingPayment ? "Syncing..." : "Sync Payment"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSubscriptionModal(true)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-md active:scale-95 transition-all ${
                subscriptionState.isExpired
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>{subscriptionState.isExpired ? "Renew with Mobile Money" : "Renew / Extend Plan"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TOP PORTAL BANNER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl glass-card p-5 sm:p-6 shadow-sm">
        <div>
          <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-bold text-purple-800">
            Student Seller Portal &bull; Ho, Volta Region
          </span>
          <h1 className="mt-2 text-2xl font-black text-gray-900 sm:text-3xl">
            {profile?.business_name || profile?.display_name || "Campus Business Hub"}
          </h1>
          <p className="mt-1 text-xs text-gray-500">
            Upload multiple products at once (up to 20), post promotional flyers, and manage inventory.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs font-black text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Post Flyer or Products</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-700 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-4 text-xs font-bold text-green-700 border border-green-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="rounded-3xl glass-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Package className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900">{activeCount}</p>
          <p className="text-xs font-semibold text-gray-500">Live Active Items</p>
        </div>

        <div className="rounded-3xl glass-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900">{pendingCount}</p>
          <p className="text-xs font-semibold text-gray-500">Pending Review</p>
        </div>

        <div className="rounded-3xl glass-card p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Tag className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900">{soldCount}</p>
          <p className="text-xs font-semibold text-gray-500">Marked as Sold</p>
        </div>
      </div>

      {/* Product Catalog Section */}
      <div className="overflow-hidden rounded-3xl glass-card shadow-sm">
        <div className="border-b border-gray-100 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900">Your Product Catalog &amp; Flyers</h2>
            <p className="text-xs text-gray-500">
              {subscriptionState.isExpired
                ? "⚠️ Listings are saved but hidden from buyers because your subscription has expired."
                : "Products and flyers reviewed by campus moderators before going live to students."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add more items</span>
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm font-semibold text-gray-900">No products or flyers listed yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Start selling by uploading up to 20 product pictures at once or posting a promotional flyer.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Products or Flyer</span>
            </button>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: Card List */}
            <div className="divide-y divide-gray-100 block md:hidden">
              {listings.map((item) => {
                const itemImg = getListingImageUrl(item.image_path);
                const isFlyer = item.listing_type === "flyer";
                const hasGallery = item.gallery_images && item.gallery_images.length > 1;

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-slate-100 shadow-sm relative">
                        {itemImg ? (
                          <img src={itemImg} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                        {hasGallery && (
                          <span className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1 text-[8px] font-bold text-white">
                            {item.gallery_images?.length} imgs
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
                            {isFlyer && <FileText className="h-3 w-3 text-purple-600" />}
                            <span>{item.category}</span>
                          </span>

                          {/* Status Badge */}
                          {subscriptionState.isExpired && item.status === "active" ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-700 border border-rose-200">
                              Hidden (Expired)
                            </span>
                          ) : item.status === "active" ? (
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-700">
                              Active
                            </span>
                          ) : item.status === "pending" ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                              Pending
                            </span>
                          ) : item.status === "sold" ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-600">
                              Sold
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700">
                              {item.status}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-1 text-sm font-bold text-gray-900 truncate">{item.title}</h3>

                        <p className="text-xs font-black text-blue-600">
                          GHS {Number(item.price_ghs).toFixed(2)}
                          {item.price_max_ghs ? ` - GHS ${Number(item.price_max_ghs).toFixed(2)}` : ""}
                        </p>

                        <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 truncate">
                          <MapPin className="h-3 w-3" />
                          <span>{item.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                      {item.status === "active" && (
                        <button
                          type="button"
                          onClick={() => updateListingStatus(item.id, "sold")}
                          className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 text-center"
                        >
                          Mark Sold
                        </button>
                      )}
                      {item.status === "sold" && (
                        <button
                          type="button"
                          onClick={() => updateListingStatus(item.id, "active")}
                          className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 text-center"
                        >
                          Relist
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteListing(item.id)}
                        className="rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 text-center"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-slate-50/70 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="p-4">Item &amp; Type</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price (GHS)</th>
                    <th className="p-4">Ho Location</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map((item) => {
                    const itemImg = getListingImageUrl(item.image_path);
                    const isFlyer = item.listing_type === "flyer";
                    const hasGallery = item.gallery_images && item.gallery_images.length > 1;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-slate-100 relative">
                              {itemImg ? (
                                <img src={itemImg} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                              {hasGallery && (
                                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white">
                                  {item.gallery_images?.length}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-gray-900">{item.title}</p>
                                {isFlyer && (
                                  <span className="rounded bg-purple-100 text-purple-800 px-1.5 py-0.2 text-[9px] font-bold">
                                    Flyer
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 line-clamp-1">{item.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 capitalize text-gray-600">{item.category}</td>
                        <td className="p-4 font-bold text-blue-600">
                          GHS {Number(item.price_ghs).toFixed(2)}
                          {item.price_max_ghs ? ` - GHS ${Number(item.price_max_ghs).toFixed(2)}` : ""}
                        </td>
                        <td className="p-4 text-gray-600">{item.location}</td>
                        <td className="p-4">
                          {subscriptionState.isExpired && item.status === "active" ? (
                            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                              Hidden (Expired)
                            </span>
                          ) : item.status === "active" ? (
                            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
                              Active
                            </span>
                          ) : item.status === "pending" ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                              Pending Review
                            </span>
                          ) : item.status === "sold" ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                              Sold
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "active" && (
                              <button
                                type="button"
                                onClick={() => updateListingStatus(item.id, "sold")}
                                className="rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Mark Sold
                              </button>
                            )}
                            {item.status === "sold" && (
                              <button
                                type="button"
                                onClick={() => updateListingStatus(item.id, "active")}
                                className="rounded-xl border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Relist
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteListing(item.id)}
                              className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete Listing"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 3. POSTING MODAL: TWO POSTING OPTIONS ("Upload Products" vs "Post a Flyer") */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* iOS Pull Handle on Mobile */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-black text-gray-900">Create Campus Listing</h3>
                <p className="text-xs text-gray-500">Reach thousands of UHAS and Ho students.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* TWO POSTING TABS */}
            <div className="grid grid-cols-2 p-2 bg-slate-100/70 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setPostingOption("products")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  postingOption === "products"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Images className="h-4 w-4" />
                <span>Upload Products (Up to 20)</span>
              </button>

              <button
                type="button"
                onClick={() => setPostingOption("flyer")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  postingOption === "flyer"
                    ? "bg-white text-purple-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Post a Flyer</span>
              </button>
            </div>

            {/* FORM CONTAINER */}
            <form onSubmit={handleCreateListing} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* -------------------------------------------------------- */}
              {/* TAB 1: UPLOAD PRODUCTS (UP TO 20 PICTURES) */}
              {/* -------------------------------------------------------- */}
              {postingOption === "products" && (
                <div className="space-y-4">
                  {/* Photo Upload Area */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                        Product Pictures ({productDrafts.length} / 20 selected) <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        Up to 20 photos at once
                      </span>
                    </div>

                    {/* Thumbnail Grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {productDrafts.map((draft, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-slate-100 group shadow-sm"
                        >
                          <img src={draft.previewUrl} alt={`Draft ${idx}`} className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveProductDraft(idx)}
                            className="absolute top-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-red-600 transition-colors shadow-sm"
                            title="Remove picture"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}

                      {/* Add more button if < 20 */}
                      {productDrafts.length < 20 && (
                        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-slate-50/70 p-2 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all active:scale-95">
                          <UploadCloud className="h-6 w-6 text-gray-400 group-hover:text-blue-600" />
                          <span className="mt-1 text-[10px] font-bold text-gray-700">Add Photos</span>
                          <span className="text-[9px] text-gray-400">Select up to 20</span>
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleMultipleImagesChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Multi-Photo Packaging Strategy (If multiple photos selected) */}
                  {productDrafts.length > 1 && (
                    <div className="rounded-2xl border border-gray-200 bg-slate-50 p-3.5 space-y-2">
                      <label className="block text-xs font-bold text-gray-800">
                        How should these {productDrafts.length} pictures be published?
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setMultiPhotoPostMode("separate_products")}
                          className={`rounded-xl p-2.5 border text-left transition-all ${
                            multiPhotoPostMode === "separate_products"
                              ? "border-blue-600 bg-white font-bold text-blue-700 shadow-sm"
                              : "border-gray-200 bg-white/70 text-gray-600"
                          }`}
                        >
                          📦 Separate Products
                          <p className="text-[10px] font-normal text-gray-400 mt-0.5">
                            Each photo becomes a separate marketplace card
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMultiPhotoPostMode("single_gallery")}
                          className={`rounded-xl p-2.5 border text-left transition-all ${
                            multiPhotoPostMode === "single_gallery"
                              ? "border-blue-600 bg-white font-bold text-blue-700 shadow-sm"
                              : "border-gray-200 bg-white/70 text-gray-600"
                          }`}
                        >
                          🖼️ 1 Product Gallery
                          <p className="text-[10px] font-normal text-gray-400 mt-0.5">
                            1 listing with a swipeable photo gallery
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Pricing Mode Toggle (Single price vs Individual prices) */}
                  {multiPhotoPostMode === "separate_products" && productDrafts.length > 1 && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800">Pricing Mode</label>
                        <span className="text-[10px] text-gray-400">Fixed or individual prices</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setPricingMode("uniform")}
                          className={`rounded-xl p-2 border text-center transition-all ${
                            pricingMode === "uniform"
                              ? "border-blue-600 bg-blue-50 font-bold text-blue-700"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          Same Price for All
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingMode("individual")}
                          className={`rounded-xl p-2 border text-center transition-all ${
                            pricingMode === "individual"
                              ? "border-blue-600 bg-blue-50 font-bold text-blue-700"
                              : "border-gray-200 text-gray-600"
                          }`}
                        >
                          Individual Prices per Item
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Title & Price Inputs (Uniform Mode) */}
                  {pricingMode === "uniform" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                          {multiPhotoPostMode === "single_gallery" || productDrafts.length === 1
                            ? "Product Title"
                            : "Collection / Batch Title"}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={uniformTitle}
                          onChange={(e) => setUniformTitle(e.target.value)}
                          placeholder="e.g. Nike Air Max (Thrift Collection) or Medical Scrubs"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                            Price (GHS) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            required
                            value={uniformPriceGhs}
                            onChange={(e) => setUniformPriceGhs(e.target.value)}
                            placeholder="e.g. 120"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                            Price Type
                          </label>
                          <select
                            value={priceType}
                            onChange={(e) => setPriceType(e.target.value as "fixed" | "range")}
                            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                          >
                            <option value="fixed">Fixed Price</option>
                            <option value="range">Price Range (Min - Max)</option>
                          </select>
                        </div>
                      </div>

                      {priceType === "range" && (
                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                            Maximum Price (GHS)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={priceMaxGhs}
                            onChange={(e) => setPriceMaxGhs(e.target.value)}
                            placeholder="e.g. 250"
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Individual Prices per Product List */
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase tracking-wider text-gray-700">
                        Set Title &amp; Price for Each Photo
                      </label>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {productDrafts.map((draft, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-slate-50/60 p-2.5"
                          >
                            <img
                              src={draft.previewUrl}
                              alt={`Draft ${idx}`}
                              className="h-12 w-12 rounded-xl object-cover shrink-0 border border-gray-200"
                            />
                            <div className="flex-1 min-w-0">
                              <input
                                type="text"
                                required
                                value={draft.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductDrafts((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, title: val } : d))
                                  );
                                }}
                                placeholder={`Item #${idx + 1} Name`}
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
                              />
                            </div>
                            <div className="w-24 shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                required
                                value={draft.priceGhs}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setProductDrafts((prev) =>
                                    prev.map((d, i) => (i === idx ? { ...d, priceGhs: val } : d))
                                  );
                                }}
                                placeholder="GHS"
                                className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 font-bold focus:border-blue-600 focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* TAB 2: POST A PROMOTIONAL FLYER */}
              {/* -------------------------------------------------------- */}
              {postingOption === "flyer" && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-black uppercase tracking-wider text-gray-700">
                      Flyer Headline / Business Service <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={flyerTitle}
                      onChange={(e) => setFlyerTitle(e.target.value)}
                      placeholder="e.g. Mawuko Hostel Vacancies &amp; Pricing 2026/2027"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  {/* Flyer Image Upload */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                      Promotional Flyer Poster <span className="text-red-500">*</span>
                    </label>
                    {flyerPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-purple-200 bg-purple-50/30 p-3 flex items-center gap-3">
                        <img src={flyerPreview} alt="Flyer preview" className="h-20 w-20 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{flyerFile?.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {flyerFile ? (flyerFile.size / 1024 / 1024).toFixed(2) : 0} MB &bull; High-res flyer
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFlyer}
                          className="rounded-xl p-2 text-gray-400 hover:text-red-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50/20 p-6 text-center cursor-pointer hover:bg-purple-50/40 transition-all">
                        <FileText className="h-8 w-8 text-purple-600" />
                        <span className="mt-2 text-xs font-bold text-gray-900">Tap to upload promotional flyer</span>
                        <span className="text-[11px] text-gray-500">Poster, price list, hostel banner (PNG, JPG)</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleFlyerChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Flyer Price or Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                        Price Type
                      </label>
                      <select
                        value={flyerPriceType}
                        onChange={(e) => setFlyerPriceType(e.target.value as "fixed" | "range")}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                      >
                        <option value="fixed">Fixed Price</option>
                        <option value="range">Price Range (From - To)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                        {flyerPriceType === "range" ? "Starting Price (GHS)" : "Service Price (GHS)"}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={flyerPriceGhs}
                        onChange={(e) => setFlyerPriceGhs(e.target.value)}
                        placeholder="e.g. 150"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {flyerPriceType === "range" && (
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                        Maximum Price (GHS)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={flyerPriceMaxGhs}
                        onChange={(e) => setFlyerPriceMaxGhs(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SHARED FIELDS: Category & Location & Description & Contact */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Location in Ho <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                  >
                    {campusLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Seller WhatsApp / Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 0241234567"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Buyers will contact you directly on WhatsApp at this number.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Description / Service Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe condition, sizes, menu, hostel amenities, or meetup spots in Ho (min 10 characters)..."
                  className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Progress Bar during upload */}
              {uploadProgressText && (
                <div className="rounded-2xl bg-blue-50 p-3.5 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-700 font-bold">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>{uploadProgressText}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-2xl border border-gray-200 bg-white py-3.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-xs font-black text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {submitting
                    ? "Processing Upload..."
                    : postingOption === "flyer"
                    ? "Publish Flyer"
                    : `Publish ${productDrafts.length || 1} Product(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SUBSCRIPTION & PAYMENT MODAL */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userId={user.id}
        userEmail={user.email}
        sellerName={profile?.business_name || profile?.display_name || "Seller"}
        defaultPhone={profile?.phone_number}
        subscriptionState={subscriptionState}
        onSuccess={() => {
          setLoading(true);
          void loadSellerData();
        }}
      />
    </div>
  );
}
