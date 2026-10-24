"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) {
      setError("Backend is not configured yet.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send password recovery email.";
      if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("rate_limit")) {
        setError("Email rate limit reached. Please wait a few moments before trying again.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Check your email</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          We have sent a secure password recovery link to <strong>{email}</strong>. Follow the link in the email to set a new password.
        </p>

        {/* Spam / Junk Notice Box */}
        <div className="mt-5 rounded-2xl bg-amber-50/90 p-4 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <span>⚠️ Can&apos;t find the email in your inbox?</span>
          </p>
          <p className="text-[11px] leading-relaxed text-amber-800">
            Please check your <strong>Spam</strong> or <strong>Junk</strong> folder. Be sure to mark it as <em>&quot;Not Spam&quot;</em> so you receive future student buyer messages and security alerts.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">Reset your password</h1>
      <p className="mt-2 text-sm text-gray-600">
        Enter your registered email address and we&apos;ll send you a link to reset your account password.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleResetPassword}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student or personal email"
              className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
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
              <span>Sending link...</span>
            </>
          ) : (
            <span>Send Reset Link</span>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-5 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
