"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { campusLocations } from "@/lib/data";
import {
  Store,
  Phone,
  PhoneCall,
  MapPin,
  Building,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface RegisterBusinessUpgradeProps {
  initialDisplayName?: string;
  onSuccess?: () => void;
}

export default function RegisterBusinessUpgrade({
  initialDisplayName = "",
  onSuccess,
}: RegisterBusinessUpgradeProps) {
  const supabase = createClient();

  const [businessName, setBusinessName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [callPhone, setCallPhone] = useState("");
  const [useSamePhone, setUseSamePhone] = useState(true);
  const [campusLocation, setCampusLocation] = useState(campusLocations[0].name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (!businessName.trim()) {
      setError("Please enter your business or brand name.");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Please enter your WhatsApp or phone number so students can contact you.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        throw new Error("You must be signed in to register a business.");
      }

      const cleanBizName = businessName.trim();
      const primaryWhatsApp = phoneNumber.trim();
      const normalCall = !useSamePhone && callPhone.trim() ? callPhone.trim() : "";
      const cleanPhone =
        normalCall && normalCall !== primaryWhatsApp
          ? `${primaryWhatsApp} | ${normalCall}`
          : primaryWhatsApp;

      // 1. Primary method: Secure upgrade_to_seller RPC
      let upgradedViaRpc = false;
      const { data: rpcData, error: rpcError } = await supabase.rpc("upgrade_to_seller", {
        p_business_name: cleanBizName,
        p_phone_number: cleanPhone,
        p_campus_location: campusLocation,
      });

      if (!rpcError && rpcData?.success) {
        upgradedViaRpc = true;
      }

      // 2. Fallback: Direct database upsert with select verification if RPC is not yet created
      if (!upgradedViaRpc) {
        const { error: upsertErr } = await supabase
          .from("profiles")
          .upsert(
            {
              id: authData.user.id,
              role: "seller",
              business_name: cleanBizName,
              phone_number: cleanPhone,
              campus_location: campusLocation,
              subscription_status: "trial",
              subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            { onConflict: "id" }
          )
          .select();

        if (upsertErr) {
          console.warn("Direct profiles upsert fallback notice:", upsertErr);
          // If upsert failed due to missing insert grant, attempt direct update
          const { error: updErr } = await supabase
            .from("profiles")
            .update({
              role: "seller",
              business_name: cleanBizName,
              phone_number: cleanPhone,
              campus_location: campusLocation,
            })
            .eq("id", authData.user.id);

          if (updErr) {
            console.error("Direct update error:", updErr);
          }
        }
      }

      // 3. Update auth metadata for immediate session consistency
      await supabase.auth.updateUser({
        data: {
          role: "seller",
          business_name: cleanBizName,
          phone_number: cleanPhone,
          campus_location: campusLocation,
        },
      });

      setSuccess("Your student business has been registered! Redirecting to seller dashboard...");

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/seller";
        }
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register business.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Student Seller Onboarding</span>
          <h2 className="text-xl font-extrabold text-gray-900">Register Your Business</h2>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        {initialDisplayName ? `Hi ${initialDisplayName}, upgrade` : "Upgrade"} your student customer account to a Student Seller to list products, food, thrift wear, or academic services on VarsMart.
      </p>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-bold text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
            Business / Brand Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Campus Thrift Kicks, Mama's Pastries, DocTech"
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">This business name will appear on all your product listings.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
            WhatsApp Line <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 h-4 w-4 text-emerald-600" />
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0541234567"
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Buyers on campus will click to chat directly with you on WhatsApp.</p>
        </div>

        {/* Normal Voice Call Line (Direct Phone Calls) */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
              <span>Normal Phone Call Line</span>
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSamePhone}
                onChange={(e) => setUseSamePhone(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Same as WhatsApp</span>
            </label>
          </div>

          {!useSamePhone && (
            <div className="mt-2.5 relative animate-in fade-in duration-200">
              <PhoneCall className="absolute left-3.5 top-3 h-4 w-4 text-blue-600" />
              <input
                type="tel"
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value)}
                placeholder="e.g. 0209876543 (direct voice call line)"
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          )}
          <p className="mt-1.5 text-[10px] text-gray-500">
            For buyers who may not have internet data and prefer to call your normal SIM line directly.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700">
            Primary Location in Ho / Suburb <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <select
              value={campusLocation}
              onChange={(e) => setCampusLocation(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-xs font-medium text-gray-900 focus:border-blue-600 focus:outline-none"
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
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registering Business...</span>
            </>
          ) : (
            <>
              <span>Complete Registration & Start Selling</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
