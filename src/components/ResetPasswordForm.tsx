"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Backend is not configured yet.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Password Updated!</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Your password has been changed successfully. Redirecting you to sign in...
        </p>

        <div className="mt-4 rounded-2xl bg-blue-50/80 p-3.5 border border-blue-200 text-left text-xs text-blue-900">
          <p className="font-bold flex items-center gap-1.5 text-blue-950 mb-0.5">
            <span>🛡️ Security Notification</span>
          </p>
          <p className="text-[11px] leading-relaxed text-blue-800">
            Your login credentials have been updated securely. If you did not perform this change, please report it immediately to VarsMart security.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          Sign in now
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Set new password</h1>
      <p className="mt-2 text-sm text-gray-600">
        Please enter a strong new password for your VarsMart account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleUpdatePassword}>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>
      </form>
    </section>
  );
}
