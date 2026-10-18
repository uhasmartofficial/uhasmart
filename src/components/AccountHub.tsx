"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUnreadMessages } from "@/lib/useUnreadMessages";
import { campusLocations } from "@/lib/data";
import RegisterBusinessUpgrade from "@/components/RegisterBusinessUpgrade";
import SubscriptionModal from "@/components/SubscriptionModal";
import { getSubscriptionState } from "@/lib/subscriptions";
import {
  ShieldCheck,
  Mail,
  LogOut,
  Store,
  MessageSquare,
  ArrowRight,
  Loader2,
  User,
  KeyRound,
  Building,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

interface ProfileData {
  display_name: string;
  role?: "customer" | "seller";
  business_name?: string | null;
  phone_number?: string | null;
  campus_location?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  trial_ends_at?: string | null;
  created_at?: string;
}

export default function AccountHub() {
  const router = useRouter();
  const supabase = createClient();
  const { unreadCount, hasUnread } = useUnreadMessages();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [listingCount, setListingCount] = useState<number>(0);
  const [signingOut, setSigningOut] = useState(false);

  // Settings & editing states
  const [activeTab, setActiveTab] = useState<"overview" | "edit-profile" | "security">("overview");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Business upgrade & subscription modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function loadAccount() {
      try {
        if (!supabase) return;
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr || !authData?.user) {
          setUser(null);
          return;
        }

        setUser(authData.user);

        // Fetch user profile and admin status concurrently
        const [profileRes, adminRes, countRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name,role,business_name,phone_number,campus_location,subscription_status,subscription_expires_at,trial_ends_at,created_at")
            .eq("id", authData.user.id)
            .maybeSingle(),
          supabase.rpc("is_admin"),
          supabase.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", authData.user.id),
        ]);

        const metaRole = authData.user.user_metadata?.role;
        const metaBizName = authData.user.user_metadata?.business_name;
        const metaPhone = authData.user.user_metadata?.phone_number;
        const metaLocation = authData.user.user_metadata?.campus_location;

        if (profileRes.data) {
          const p = profileRes.data as ProfileData;
          // If metadata indicates seller but profile table hasn't updated yet, sync and self-heal
          if (metaRole === "seller" && p.role !== "seller") {
            p.role = "seller";
            p.business_name = p.business_name || metaBizName || "Campus Business";
            p.phone_number = p.phone_number || metaPhone || null;
            p.campus_location = p.campus_location || metaLocation || campusLocations[0].name;

            // Trigger silent background database sync
            void (async () => {
              try {
                const { error: rpcErr } = await supabase.rpc("upgrade_to_seller", {
                  p_business_name: p.business_name,
                  p_phone_number: p.phone_number || "",
                  p_campus_location: p.campus_location || campusLocations[0].name,
                });
                if (rpcErr) {
                  await supabase
                    .from("profiles")
                    .update({
                      role: "seller",
                      business_name: p.business_name,
                      phone_number: p.phone_number,
                      campus_location: p.campus_location,
                    })
                    .eq("id", authData.user.id);
                }
              } catch (e) {
                console.warn("Self-heal sync notice:", e);
              }
            })();
          }

          setProfile(p);
          setEditDisplayName(p.display_name || "");
          setEditBusinessName(p.business_name || "");
          setEditPhone(p.phone_number || "");
          setEditLocation(p.campus_location || campusLocations[0].name);
        } else {
          const defaultName =
            authData.user.user_metadata?.display_name || authData.user.email?.split("@")[0] || "Student";
          const resolvedRole = metaRole === "seller" ? "seller" : "customer";

          const p: ProfileData = {
            display_name: defaultName,
            role: resolvedRole,
            business_name: metaBizName || null,
            phone_number: metaPhone || null,
            campus_location: metaLocation || campusLocations[0].name,
          };

          setProfile(p);
          setEditDisplayName(defaultName);
          setEditBusinessName(p.business_name || "");
          setEditPhone(p.phone_number || "");
          setEditLocation(p.campus_location || campusLocations[0].name);

          // If row missing from profiles, self-heal via RPC
          if (resolvedRole === "seller") {
            void supabase.rpc("upgrade_to_seller", {
              p_business_name: metaBizName || "Campus Business",
              p_phone_number: metaPhone || "",
              p_campus_location: metaLocation || campusLocations[0].name,
            });
          }
        }

        if (adminRes.data) setIsAdmin(Boolean(adminRes.data));
        if (countRes.count !== null && countRes.count !== undefined) setListingCount(countRes.count);
      } catch (err) {
        console.error("Account load error:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [supabase]);

  async function handleSignOut() {
    if (!supabase) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user) return;

    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const updates: Partial<ProfileData> = {
        display_name: editDisplayName.trim(),
        campus_location: editLocation.trim() || null,
        phone_number: editPhone.trim() || null,
      };

      if (profile?.role === "seller") {
        updates.business_name = editBusinessName.trim() || null;
      }

      const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setProfileSuccess("Your profile details were updated successfully!");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !user?.email) return;

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Current password is incorrect. Please check and try again.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess("Your password was updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    if (!supabase) return;
    if (deleteConfirmation !== "DELETE") {
      setDeleteError("Please type DELETE to confirm.");
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");

    try {
      const { error: rpcError } = await supabase.rpc("delete_user_account");
      if (rpcError) throw rpcError;

      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl glass-card p-12 text-center shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-xs font-semibold text-gray-500">Loading your student account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl glass-card p-8 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 mb-3">
          <User className="h-6 w-6" />
        </div>
        <p className="text-base font-bold text-gray-900">Sign In to View Account</p>
        <p className="mt-1 text-xs text-gray-500">You must be logged in to manage your profile and listings.</p>
        <Link
          href="/login"
          className="mt-5 rounded-2xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const isSeller = profile?.role === "seller";
  const displayName = profile?.display_name || user.email?.split("@")[0] || "Student";
  const businessName = profile?.business_name;

  return (
    <section className="w-full max-w-2xl rounded-3xl glass-card p-5 sm:p-8 shadow-xl border border-white/60">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-gray-100 pb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-black text-white shadow-md shadow-blue-500/20 shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-extrabold text-gray-900">{displayName}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                isSeller ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isSeller ? "Verified Student Seller" : "Student Customer"}
            </span>
            {isAdmin && (
              <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                Admin
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 truncate text-xs text-gray-500 mt-1">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            <span>{user.email}</span>
          </p>
          {profile?.campus_location && (
            <p className="flex items-center gap-1.5 text-xs text-blue-700 font-medium mt-1">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              <span>{profile.campus_location}</span>
            </p>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-5 flex gap-1.5 border-b border-gray-100 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 active:scale-95 ${
            activeTab === "overview" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-600 hover:bg-white/80"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("edit-profile")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 active:scale-95 ${
            activeTab === "edit-profile" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-600 hover:bg-white/80"
          }`}
        >
          <Building className="h-3.5 w-3.5" />
          <span>Edit Profile</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 active:scale-95 ${
            activeTab === "security" ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "text-gray-600 hover:bg-white/80"
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          <span>Password &amp; Security</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="mt-6 space-y-3.5">
          {isSeller ? (
            <div className="space-y-3">
              <Link
                href="/seller"
                className="group flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 transition-all hover:bg-emerald-100/60 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                    <Store className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-emerald-950">
                      {businessName || "My Campus Shop"}
                    </p>
                    <p className="text-xs text-emerald-700">
                      {listingCount} listings &bull; Manage campus products
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-600 transition-transform group-hover:translate-x-0.5" />
              </Link>

              {/* Seller Subscription Box */}
              {(() => {
                const subState = getSubscriptionState(profile);
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-blue-200/80 bg-blue-50/40">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
                        <Zap className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-900">
                            {subState.isExpired
                              ? "Subscription Expired"
                              : subState.isTrial
                              ? `30-Day Free Trial (${subState.daysRemaining} days left)`
                              : `Active Plan (Expires ${subState.formattedExpiry})`}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.2 text-[9px] font-black uppercase ${
                              subState.isExpired
                                ? "bg-rose-100 text-rose-800"
                                : subState.daysRemaining <= 5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {subState.isExpired ? "Expired" : "Active"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {subState.isExpired
                            ? "Your listings are hidden from buyers until subscription is renewed."
                            : "MTN MoMo, Telecel Cash & AT Money automatic billing."}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSubscriptionModal(true)}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all shrink-0"
                    >
                      {subState.isExpired ? "Renew with MoMo" : "Manage / Extend Plan"}
                    </button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shrink-0">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-blue-950">Sell on UHASMART</p>
                  <p className="text-xs text-blue-700">Register your student brand &amp; post products</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 shrink-0"
              >
                <span>Upgrade to Seller</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Inquiry Messages Shortcut with Live Badge */}
          <Link
            href="/messages"
            className="group flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/70 p-4 transition-all hover:bg-white shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                    {unreadCount}
                  </span>
                )}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700">Inquiry Messages</p>
                  {hasUnread && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200 animate-pulse">
                      New messages
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Real-time buyer &amp; seller chats</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </Link>

          {/* Admin Control Center (if applicable) */}
          {isAdmin && (
            <Link
              href="/admin"
              className="group flex items-center justify-between rounded-2xl border border-purple-200/80 bg-purple-50/60 p-4 transition-all hover:bg-purple-100/60 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-700 text-white shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-purple-900">Admin Control Center</p>
                  <p className="text-xs text-purple-700">Moderation, users &amp; queue approvals</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-purple-600 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}

          {/* Browse Marketplace */}
          <Link
            href="/marketplace"
            className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white/40 p-4 transition-all hover:bg-white/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-gray-800">Browse Campus Marketplace</p>
                <p className="text-xs text-gray-400">Discover items from student vendors</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE */}
      {activeTab === "edit-profile" && (
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          {profileSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700 border border-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
              Display / Full Name
            </label>
            <input
              type="text"
              required
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {isSeller && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Business / Brand Name
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  required
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
              WhatsApp / Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="tel"
                placeholder="e.g. 024 123 4567"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Used so students can message you for fast campus deliveries.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
              Primary Location in Ho / Suburb
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <select
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 pl-10 pr-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              >
                {campusLocations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 active:scale-95"
          >
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Save Profile Details</span>
          </button>
        </form>
      )}

      {/* TAB 3: PASSWORD & SECURITY */}
      {activeTab === "security" && (
        <div className="mt-6 space-y-6">
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">Change Password</h2>

            {passwordSuccess && (
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700 border border-green-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white/80 px-4 py-2.5 text-xs text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-50 active:scale-95"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Update Password</span>
            </button>
          </form>

          {/* Danger Zone */}
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Danger Zone</span>
            </h3>
            <p className="mt-1 text-xs text-red-700">
              Permanently delete your UHASMART account, products, and inquiry data.
            </p>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Sign Out Button */}
      <div className="mt-8 border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 text-xs font-bold text-gray-700 shadow-sm hover:bg-white disabled:opacity-50 active:scale-95"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>

      {/* Business Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl glass-modal p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-extrabold text-gray-900">Upgrade to Campus Seller</h3>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <RegisterBusinessUpgrade
              initialDisplayName={displayName}
              onSuccess={() => {
                setShowUpgradeModal(false);
                setLoading(true);
                // Trigger reload to fetch freshly persisted database role
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl glass-modal p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-gray-900">Are you absolutely sure?</h3>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">
              This action cannot be undone. All your listings, messages, and student profile information will be deleted.
            </p>
            <p className="mt-3 text-xs font-bold text-gray-800">
              Please type <span className="font-mono text-red-600">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="mt-2 w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 focus:border-red-600 focus:outline-none"
            />
            {deleteError && (
              <p className="mt-2 text-xs font-semibold text-red-600">{deleteError}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                  setDeleteError("");
                }}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount || deleteConfirmation !== "DELETE"}
                onClick={handleDeleteAccount}
                className="flex-1 rounded-2xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 active:scale-95"
              >
                {deletingAccount ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {user && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          userId={user.id}
          defaultPhone={profile?.phone_number}
          subscriptionState={getSubscriptionState(profile)}
          onSuccess={() => {
            setLoading(true);
            // reload user profile data
            const loadAgain = async () => {
              if (!supabase) return;
              const { data: authData } = await supabase.auth.getUser();
              if (authData?.user) {
                const { data: pData } = await supabase
                  .from("profiles")
                  .select("display_name,role,business_name,phone_number,campus_location,subscription_status,subscription_expires_at,trial_ends_at,created_at")
                  .eq("id", authData.user.id)
                  .maybeSingle();
                if (pData) setProfile(pData as ProfileData);
              }
              setLoading(false);
            };
            void loadAgain();
          }}
        />
      )}
    </section>
  );
}
