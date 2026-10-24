"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import RegisterBusinessUpgrade from "@/components/RegisterBusinessUpgrade";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Store, CheckCircle2, ArrowRight } from "lucide-react";

interface ProfileState {
  display_name: string;
  role: string;
  business_name?: string | null;
}

export default function RegisterBusinessView() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkState() {
      try {
        if (!supabase) return;
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (isMounted) setUser({ id: authData.user.id });

        const { data: profData } = await supabase
          .from("profiles")
          .select("display_name,role,business_name")
          .eq("id", authData.user.id)
          .maybeSingle();

        const metaRole = authData.user.user_metadata?.role;
        const metaBiz = authData.user.user_metadata?.business_name;

        if (isMounted) {
          if (profData) {
            const p = profData as ProfileState;
            if (metaRole === "seller" && p.role !== "seller") {
              p.role = "seller";
              p.business_name = p.business_name || metaBiz || null;
            }
            setProfile(p);
          } else if (metaRole === "seller") {
            setProfile({
              display_name: authData.user.user_metadata?.display_name || "Seller",
              role: "seller",
              business_name: metaBiz || null,
            });
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading register-business state:", err);
        if (isMounted) setLoading(false);
      }
    }

    void checkState();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex w-full max-w-md flex-col items-center justify-center rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-xs font-semibold text-gray-500">Checking account status...</p>
      </div>
    );
  }

  // Not signed in: show new seller registration
  if (!user) {
    return <AuthForm mode="register" defaultRole="seller" />;
  }

  // Signed in as Seller: already registered!
  if (profile?.role === "seller") {
    return (
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-gray-900">Business Already Registered</h2>
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Your student business{" "}
          <strong className="font-bold text-gray-900">
            {profile.business_name || "Campus Business"}
          </strong>{" "}
          is registered and active on VarsMart.
        </p>
        <Link
          href="/seller"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <Store className="h-4 w-4" />
          <span>Open Seller Dashboard</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // Signed in as Customer: upgrade existing account to Seller!
  return (
    <RegisterBusinessUpgrade
      initialDisplayName={profile?.display_name}
      onSuccess={() => {
        window.location.href = "/seller";
      }}
    />
  );
}
