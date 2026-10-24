/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { categories } from "@/lib/data";
import { getListingImageUrl } from "@/lib/storage";
import {
  ShieldCheck,
  Package,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  RefreshCw,
  Store,
  Clock,
  MapPin,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface AdminStats {
  total_users: number;
  total_customers: number;
  total_sellers: number;
  active_listings: number;
  pending_listings: number;
  rejected_listings: number;
  total_reports: number;
}

interface ListingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price_ghs: number;
  location: string;
  status: "pending" | "active" | "rejected" | "sold" | "withdrawn";
  created_at: string;
  seller_id?: string;
  image_path?: string | null;
  profiles: { display_name: string; phone_number?: string | null; business_name?: string | null } | null;
}

interface PendingReport {
  id: string;
  listing_id: string;
  reason: string;
  created_at: string;
  listings: { id: string; title: string; price_ghs: number } | null;
  profiles?: { display_name: string } | null;
}

interface AdminUser {
  id: string;
  display_name: string;
  role: string;
  business_name: string | null;
  phone_number: string | null;
  campus_location: string | null;
  created_at: string;
  is_moderator: boolean;
  is_admin_role: boolean;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [configured, setConfigured] = useState(Boolean(supabase));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"overview" | "queue" | "listings" | "reports" | "users">("overview");

  // Platform data
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_customers: 0,
    total_sellers: 0,
    active_listings: 0,
    pending_listings: 0,
    rejected_listings: 0,
    total_reports: 0,
  });

  const [pendingListings, setPendingListings] = useState<ListingItem[]>([]);
  const [allListings, setAllListings] = useState<ListingItem[]>([]);
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Search & Filter state
  const [listingSearch, setListingSearch] = useState("");
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState("");

  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setConfigured(false);
      setLoading(false);
      return;
    }

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

    setSignedIn(true);
    setCurrentUser({ id: auth.user.id, email: auth.user.email });

    const { data: isAdmin, error: profileError } = await supabase.rpc("is_admin");
    if (profileError || !isAdmin) {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    try {
      const statsRes = await supabase.rpc("get_admin_stats");
      if (statsRes.data) {
        setStats(statsRes.data as AdminStats);
      }

      // Pending listings
      const { data: pListings } = await supabase
        .from("listings")
        .select("id,title,description,category,price_ghs,location,status,created_at,image_path,profiles(display_name,phone_number,business_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      setPendingListings((pListings as unknown as ListingItem[]) ?? []);

      // All listings
      const { data: aListings } = await supabase
        .from("listings")
        .select("id,title,description,category,price_ghs,location,status,created_at,image_path,profiles(display_name,phone_number,business_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setAllListings((aListings as unknown as ListingItem[]) ?? []);

      // Reports
      const { data: reportList } = await supabase
        .from("listing_reports")
        .select("id,listing_id,reason,created_at,listings(id,title,price_ghs)")
        .is("reviewed_at", null)
        .order("created_at", { ascending: true });
      setReports((reportList as unknown as PendingReport[]) ?? []);

      // User directory
      const usersRes = await supabase.rpc("get_admin_users");
      if (usersRes.data) {
        setUsers(usersRes.data as AdminUser[]);
      } else {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,display_name,role,business_name,phone_number,campus_location,created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (profs) {
          interface ProfileFallback {
            id: string;
            display_name: string;
            role?: string | null;
            business_name?: string | null;
            phone_number?: string | null;
            campus_location?: string | null;
            created_at: string;
          }
          setUsers(
            (profs as ProfileFallback[]).map((p) => ({
              id: p.id,
              display_name: p.display_name,
              role: p.role ?? "customer",
              business_name: p.business_name ?? null,
              phone_number: p.phone_number ?? null,
              campus_location: p.campus_location ?? null,
              created_at: p.created_at,
              is_moderator: false,
              is_admin_role: false,
            }))
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin dataset.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    setSuccess("");
    await loadData();
  }

  async function updateListingStatus(id: string, newStatus: "active" | "rejected") {
    if (!supabase) return;
    setWorkingId(id);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("listings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(`Listing successfully marked as ${newStatus}.`);
      await loadData();
    }
    setWorkingId("");
  }

  async function handleDeleteListing(id: string) {
    if (!supabase || !confirm("Are you sure you want to permanently delete this listing?")) return;
    setWorkingId(id);
    setError("");
    setSuccess("");

    const { error: delError } = await supabase.rpc("admin_delete_listing", { p_listing_id: id });
    if (delError) {
      const { error: directErr } = await supabase.from("listings").delete().eq("id", id);
      if (directErr) setError(directErr.message);
      else {
        setSuccess("Listing permanently deleted.");
        await loadData();
      }
    } else {
      setSuccess("Listing permanently deleted.");
      await loadData();
    }
    setWorkingId("");
  }

  async function resolveReport(reportId: string, action: "dismiss" | "delete_listing", listingId?: string) {
    if (!supabase || !currentUser) return;
    setWorkingId(reportId);
    setError("");
    setSuccess("");

    try {
      if (action === "delete_listing" && listingId) {
        await supabase.rpc("admin_delete_listing", { p_listing_id: listingId });
      }

      const { error: repErr } = await supabase
        .from("listing_reports")
        .update({ reviewed_at: new Date().toISOString(), reviewed_by: currentUser.id })
        .eq("id", reportId);

      if (repErr) throw repErr;

      setSuccess(action === "delete_listing" ? "Listing removed and report resolved." : "Report marked as reviewed.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve report.");
    } finally {
      setWorkingId("");
    }
  }

  async function toggleModerator(userId: string) {
    if (!supabase) return;
    setWorkingId(userId);
    setError("");
    setSuccess("");

    const { data: newStatus, error: modErr } = await supabase.rpc("admin_toggle_moderator", { p_user_id: userId });
    if (modErr) {
      setError(modErr.message);
    } else {
      setSuccess(newStatus ? "User granted moderator privileges." : "Moderator privileges revoked.");
      await loadData();
    }
    setWorkingId("");
  }

  async function toggleAdminRole(userId: string) {
    if (!supabase) return;
    if (userId === currentUser?.id) {
      setError("You cannot change your own admin status.");
      return;
    }
    setWorkingId(userId);
    setError("");
    setSuccess("");

    const { data: newStatus, error: admErr } = await supabase.rpc("admin_toggle_admin_role", { p_user_id: userId });
    if (admErr) {
      setError(admErr.message);
    } else {
      setSuccess(newStatus ? "User granted Admin privileges." : "Admin privileges revoked.");
      await loadData();
    }
    setWorkingId("");
  }

  function copyAdminSql() {
    if (!currentUser) return;
    const sql = `INSERT INTO public.user_roles (user_id, role) VALUES ('${currentUser.id}', 'admin') ON CONFLICT DO NOTHING;`;
    void navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex w-full flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-sm font-semibold text-gray-700">Loading VarsMart Admin Console...</p>
      </div>
    );
  }

  if (!configured) {
    return (
      <section className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Database Connection Required</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Add your Supabase project URL and anon key to enable moderation tools.
        </p>
      </section>
    );
  }

  if (!signedIn) {
    return (
      <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Sign in to Access Admin</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Moderator and administrator access requires an authenticated VarsMart account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Sign in
        </Link>
      </section>
    );
  }

  if (!authorized) {
    return (
      <section className="w-full max-w-2xl rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Administrator Access Required</h1>
            <p className="text-xs text-gray-500">Account ID: {currentUser?.id}</p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          Your account is signed in as <strong>{currentUser?.email}</strong>, but has not yet been assigned the <strong>admin</strong> role in Supabase.
        </p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">How to activate admin access</p>
          <p className="mt-1 text-xs text-gray-600">
            Run this one-line command in your Supabase SQL Editor:
          </p>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-xs font-mono text-green-400">
            <span className="truncate">
              INSERT INTO public.user_roles (user_id, role) VALUES (&apos;{currentUser?.id}&apos;, &apos;admin&apos;);
            </span>
            <button
              type="button"
              onClick={copyAdminSql}
              className="ml-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-gray-700"
            >
              {copiedSql ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedSql ? "Copied" : "Copy SQL"}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            I&apos;ve run the SQL, Check Again
          </button>
          <Link href="/marketplace" className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            Return to Marketplace
          </Link>
        </div>
      </section>
    );
  }

  const filteredListings = allListings.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.description.toLowerCase().includes(listingSearch.toLowerCase()) ||
      (l.profiles?.display_name ?? "").toLowerCase().includes(listingSearch.toLowerCase());
    const matchesStatus = listingStatusFilter === "all" || l.status === listingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((u) => {
    return (
      u.display_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.business_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone_number ?? "").toLowerCase().includes(userSearch.toLowerCase())
    );
  });

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
              Admin &amp; Moderator Hub
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Authorized
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">VarsMart Moderation Control</h1>
          <p className="mt-1 text-xs text-gray-500">
            Signed in as {currentUser?.email} &bull; Manage student sellers, items, and platform safety.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-blue-600 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {[
          { id: "overview", label: "Overview", icon: Sparkles },
          { id: "queue", label: `Review Queue (${pendingListings.length})`, icon: Clock, badge: pendingListings.length > 0 },
          { id: "listings", label: `All Listings (${allListings.length})`, icon: Package },
          { id: "reports", label: `Reports (${reports.length})`, icon: AlertTriangle, badge: reports.length > 0 },
          { id: "users", label: `User Directory (${users.length})`, icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                setError("");
                setSuccess("");
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${isActive ? "bg-white text-blue-700" : "bg-red-500 text-white"}`}>
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{pendingListings.length}</p>
              <p className="text-xs font-semibold text-gray-500">Pending Approvals</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <Package className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{stats.active_listings || allListings.filter((l) => l.status === "active").length}</p>
              <p className="text-xs font-semibold text-gray-500">Live Active Items</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{stats.total_users || users.length}</p>
              <p className="text-xs font-semibold text-gray-500">Registered Students</p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{reports.length}</p>
              <p className="text-xs font-semibold text-gray-500">Flagged Reports</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE */}
      {activeTab === "queue" && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Pending Review Queue ({pendingListings.length})</h2>
          <p className="text-xs text-gray-500">Approve or reject listings before they go live on the marketplace.</p>

          {pendingListings.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-3 text-base font-bold text-gray-900">Queue is Clear!</h3>
              <p className="mt-1 text-xs text-gray-500">All submitted items have been reviewed.</p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-gray-100">
              {pendingListings.map((item) => (
                <div key={item.id} className="py-6 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex gap-4 max-w-2xl">
                      {item.image_path && (
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-slate-100">
                          <img
                            src={getListingImageUrl(item.image_path) || ""}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                            {categories.find((c) => c.id === item.category)?.name ?? item.category}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="mt-2 text-lg font-extrabold text-gray-900">{item.title}</h3>
                        <p className="mt-1 text-base font-bold text-blue-600">GHS {Number(item.price_ghs).toFixed(2)}</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{item.description}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-semibold text-gray-700">
                            <Store className="h-3.5 w-3.5 text-blue-600" />
                            {item.profiles?.business_name || item.profiles?.display_name || "Seller"}
                          </span>
                          {item.profiles?.phone_number && (
                            <span>Phone: {item.profiles.phone_number}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {item.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={workingId === item.id}
                        onClick={() => void updateListingStatus(item.id, "active")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={workingId === item.id}
                        onClick={() => void updateListingStatus(item.id, "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALL LISTINGS */}
      {activeTab === "listings" && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">All Marketplace Listings</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search title, seller..."
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-900 focus:outline-none"
                />
              </div>
              <select
                value={listingStatusFilter}
                onChange={(e) => setListingStatusFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Seller</th>
                  <th className="py-3 px-4 font-semibold">Price</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No listings match your search.
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-slate-100">
                            {l.image_path ? (
                              <img
                                src={getListingImageUrl(l.image_path) || ""}
                                alt={l.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-gray-400">
                                <Package className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <span className="font-bold text-gray-900">{l.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{l.profiles?.business_name || l.profiles?.display_name || "Unknown"}</td>
                      <td className="py-3 px-4 font-bold text-blue-600">GHS {Number(l.price_ghs).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteListing(l.id)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS */}
      {activeTab === "reports" && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Student Reports ({reports.length})</h2>
          {reports.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-3 text-base font-bold text-gray-900">Zero Unresolved Reports</h3>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-gray-100">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-4 first:pt-0">
                  <div>
                    <h3 className="font-bold text-gray-900">{r.listings?.title ?? "Listing"}</h3>
                    <p className="mt-1 text-xs text-gray-600">{r.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void resolveReport(r.id, "dismiss")}
                      className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                    {r.listings && (
                      <button
                        type="button"
                        onClick={() => void resolveReport(r.id, "delete_listing", r.listing_id)}
                        className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Remove Item
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: USER DIRECTORY */}
      {activeTab === "users" && (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Student &amp; Seller Directory ({users.length})</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Name / Business</th>
                  <th className="py-3 px-4 font-semibold">Account Type</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">Privileges</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{u.display_name}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            u.role === "seller" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {u.role === "seller" ? "Student Seller" : "Student Customer"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{u.phone_number || "—"}</td>
                      <td className="py-3.5 px-4">
                        {u.is_admin_role ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-800">
                            Super Admin
                          </span>
                        ) : u.is_moderator ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            Moderator
                          </span>
                        ) : (
                          <span className="text-gray-400">Regular</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.id !== currentUser?.id ? (
                            <>
                              <button
                                type="button"
                                disabled={workingId === u.id}
                                onClick={() => void toggleAdminRole(u.id)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  u.is_admin_role
                                    ? "border border-red-200 text-red-700 hover:bg-red-50"
                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                              >
                                {u.is_admin_role ? "Demote Admin" : "Make Admin"}
                              </button>
                              <button
                                type="button"
                                disabled={workingId === u.id}
                                onClick={() => void toggleModerator(u.id)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                                  u.is_moderator
                                    ? "border border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                              >
                                {u.is_moderator ? "Revoke Mod" : "Make Mod"}
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-gray-400 italic">You (Current)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
