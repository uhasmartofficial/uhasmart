"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, Store, Building, Phone, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { campusLocations } from "@/lib/data";

interface AuthFormProps {
  mode: "login" | "register";
  defaultRole?: "customer" | "seller";
}

export default function AuthForm({ mode, defaultRole = "customer" }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"customer" | "seller">(defaultRole);
  const isRegister = mode === "register";
  const supabase = createClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase) {
      setError("Authentication is not configured. Please check your Supabase environment settings.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setSubmitting(true);

    try {
      if (isRegister) {
        const displayName = String(formData.get("displayName") ?? "").trim();
        const businessName = String(formData.get("businessName") ?? "").trim();
        const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
        const campusLocation = String(formData.get("campusLocation") ?? "").trim();

        if (!displayName) throw new Error("Please enter your full name.");

        const metadata: Record<string, string> = {
          display_name: displayName,
          role: selectedRole,
        };

        if (selectedRole === "seller") {
          if (!businessName) throw new Error("Please enter your business or brand name.");
          if (!phoneNumber) throw new Error("Please enter a WhatsApp or phone number for customer inquiries.");
          metadata.business_name = businessName;
          metadata.phone_number = phoneNumber;
          metadata.campus_location = campusLocation;
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) throw authError;

        if (data.session) {
          router.push(selectedRole === "seller" ? "/seller" : "/marketplace");
          router.refresh();
        } else {
          setMessage(
            "Account created! We've sent a verification link to your email. (Please check your Spam or Junk folder if you don't see it in your inbox)."
          );
        }
      } else {
        const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        // Role-based redirect: sellers go to their dashboard, customers go to marketplace
        const userRole = signInData?.user?.user_metadata?.role;
        router.push(userRole === "seller" ? "/seller" : "/marketplace");
        router.refresh();
      }
    } catch (authError) {
      const raw = authError instanceof Error ? authError.message : "The account request could not be completed.";
      if (raw.toLowerCase().includes("rate limit") || raw.toLowerCase().includes("rate_limit")) {
        setError("Too many signup attempts. Please wait a few moments or disable 'Confirm email' in Supabase.");
      } else {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Campus Community</p>
        {isRegister && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {selectedRole === "seller" ? "Seller Registration" : "Customer Registration"}
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
        {isRegister
          ? selectedRole === "seller"
            ? "Register your student business"
            : "Create your student account"
          : "Sign in to VarsMart"}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {isRegister
          ? selectedRole === "seller"
            ? "Start listing your campus products or services to reach fellow campus students."
            : "Sign up to browse, buy, and directly contact verified campus sellers."
          : "Sign in to manage your listings, view chats, and access your account."}
      </p>

      {/* Account Type Selector for Registration */}
      {isRegister && (
        <div className="mt-6">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
            I want to use VarsMart to:
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole("customer")}
              className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all ${
                selectedRole === "customer"
                  ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={`rounded-xl p-2 ${selectedRole === "customer" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="mt-2 text-sm font-bold">Student Customer</span>
              <span className="mt-0.5 text-[11px] leading-tight text-gray-500">Browse & buy on campus</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole("seller")}
              className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition-all ${
                selectedRole === "seller"
                  ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className={`rounded-xl p-2 ${selectedRole === "seller" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                <Store className="h-5 w-5" />
              </span>
              <span className="mt-2 text-sm font-bold">Student Seller</span>
              <span className="mt-0.5 text-[11px] leading-tight text-gray-500">List items & sell to students</span>
            </button>
          </div>
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {isRegister && (
          <div>
            <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-gray-700">
              {selectedRole === "seller" ? "Your Full Name (Owner)" : "Full Name"}
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        )}

        {/* Dedicated fields for Student Seller */}
        {isRegister && selectedRole === "seller" && (
          <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Campus Business Information
            </p>

            <div>
              <label htmlFor="businessName" className="mb-1.5 block text-sm font-medium text-gray-700">
                Business / Brand Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  required
                  placeholder="e.g. Volta Kicks & Thrift"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
                WhatsApp / Call Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  placeholder="e.g. 024 123 4567"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Interested buyers across Ho will contact you directly on WhatsApp via this number.
              </p>
            </div>

            <div>
              <label htmlFor="campusLocation" className="mb-1.5 block text-sm font-medium text-gray-700">
                Primary Location in Ho / Suburb
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                <select
                  id="campusLocation"
                  name="campusLocation"
                  className="w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {campusLocations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="student or personal email"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            {!isRegister && (
              <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="space-y-2.5 rounded-2xl bg-green-50/90 p-4 border border-green-200 text-xs text-green-950" role="status">
            <div className="flex items-center gap-2 font-bold text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              <span>Verification Email Sent!</span>
            </div>
            <p className="text-[11px] text-green-900 leading-relaxed">
              {message}
            </p>
            <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold text-amber-950">⚠️ Can&apos;t find the email in your inbox?</p>
              <p className="leading-relaxed text-amber-800">
                Please check your <strong>Spam</strong> or <strong>Junk</strong> folder. Mark it as <em>&quot;Not Spam&quot;</em> so you receive student buyer chats and listing approvals.
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Please wait...</span>
            </>
          ) : (
            <span>
              {isRegister
                ? selectedRole === "seller"
                  ? "Create Seller Account"
                  : "Create Customer Account"
                : "Sign In"}
            </span>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-5 text-center text-sm text-gray-600">
        {isRegister ? (
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        ) : (
          <p>
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-bold text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
