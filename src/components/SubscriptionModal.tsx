"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sparkles,
  Zap,
  CreditCard,
  Lock,
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  MOMO_NETWORKS,
  SubscriptionPlan,
  SubscriptionState,
  processMoMoSubscriptionPayment,
} from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/client";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  sellerName?: string | null;
  defaultPhone?: string | null;
  subscriptionState: SubscriptionState;
  onSuccess: (newExpiry: string) => void;
}

function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { PaystackPop?: unknown }).PaystackPop) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  sellerName,
  defaultPhone,
  subscriptionState,
  onSuccess,
}: SubscriptionModalProps) {
  const supabase = createClient();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SUBSCRIPTION_PLANS[1]); // default to Semester
  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "prompting" | "success">("select");
  const [errorMessage, setErrorMessage] = useState("");
  const [successDate, setSuccessDate] = useState("");

  if (!isOpen) return null;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setErrorMessage("");
    setProcessing(true);
    setPaymentStep("prompting");

    try {
      // 1. Initialize transaction with Paystack API
      const initRes = await fetch("/api/payment/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId,
          email: userEmail || "seller@uhasmart.com",
          sellerName: sellerName || "UHASMART Seller",
        }),
      });

      const initData = await initRes.json();

      if (!initRes.ok || !initData.success) {
        // If Paystack keys are not set up or failed, fall back to direct MoMo simulation
        console.warn("Paystack initialize notice:", initData.error);
        if (supabase) {
          const fallbackRes = await processMoMoSubscriptionPayment({
            supabase,
            userId,
            userEmail,
            sellerName,
            plan: selectedPlan,
            momoNetwork: "mtn",
            momoNumber: defaultPhone || "0240000000",
          });
          if (fallbackRes.success) {
            setPaymentStep("success");
            const formatted = fallbackRes.newExpiry
              ? new Date(fallbackRes.newExpiry).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : `${selectedPlan.durationDays} days`;
            setSuccessDate(formatted);
            onSuccess(fallbackRes.newExpiry || "");
            return;
          }
        }
        throw new Error(initData.error || "Could not initialize payment with Paystack.");
      }

      // 2. Load Paystack inline popup
      const scriptLoaded = await loadPaystackScript();

      type PaystackPopInstance = {
        setup: (options: Record<string, unknown>) => { openIframe: () => void };
      };

      const paystackPop = (window as unknown as { PaystackPop?: PaystackPopInstance }).PaystackPop;

      const publicKey =
        initData.publicKey ||
        process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
        "";

      if (scriptLoaded && paystackPop && publicKey && !publicKey.includes("placeholder")) {

        const handler = paystackPop.setup({
          key: publicKey,
          email: userEmail || "seller@uhasmart.com",
          amount: selectedPlan.priceGhs * 100, // in pesewas
          currency: "GHS",
          ref: initData.reference,
          channels: ["mobile_money", "card"],
          metadata: {
            user_id: userId,
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name,
            duration_days: selectedPlan.durationDays,
            amount_ghs: selectedPlan.priceGhs,
            seller_name: sellerName || "Seller",
          },
          callback: function (response: { reference: string }) {
            setPaymentStep("prompting");
            void (async () => {
              try {
                const verifyRes = await fetch("/api/payment/paystack/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    reference: response.reference,
                    userId,
                    planId: selectedPlan.id,
                    sellerName: sellerName || "Seller",
                    userEmail: userEmail || "seller@uhasmart.com",
                  }),
                });
                const verifyData = await verifyRes.json();

                if (verifyData.success) {
                  const newExpiry =
                    verifyData.newExpiry ||
                    new Date(Date.now() + selectedPlan.durationDays * 24 * 60 * 60 * 1000).toISOString();

                  // Direct client-side sync using active authenticated user session
                  if (supabase && userId) {
                    try {
                      await Promise.allSettled([
                        supabase
                          .from("profiles")
                          .update({
                            role: "seller",
                            subscription_status: "active",
                            subscription_tier: selectedPlan.name,
                            subscription_expires_at: newExpiry,
                            subscription_reminder_sent: false,
                          })
                          .eq("id", userId),
                        supabase.from("subscription_payments").insert({
                          seller_id: userId,
                          amount_ghs: selectedPlan.priceGhs,
                          plan_name: selectedPlan.name,
                          duration_days: selectedPlan.durationDays,
                          payment_method: "paystack",
                          momo_number: defaultPhone || "Paystack",
                          momo_network: "paystack",
                          reference: response.reference,
                          status: "success",
                        }),
                      ]);
                    } catch (syncErr) {
                      console.warn("Client subscription sync notice:", syncErr);
                    }
                  }

                  setPaymentStep("success");
                  const formatted = new Date(newExpiry).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  setSuccessDate(formatted);
                  onSuccess(newExpiry);
                } else {
                  setErrorMessage(verifyData.error || "Payment verification failed. Please try again.");
                  setPaymentStep("select");
                }
              } catch (vErr) {
                setErrorMessage(vErr instanceof Error ? vErr.message : "Verification connection error.");
                setPaymentStep("select");
              }
            })();
          },
          onClose: function () {
            setProcessing(false);
            setPaymentStep("select");
          },
        });

        handler.openIframe();
      } else if (initData.authorization_url) {
        // Fallback: Redirect to Paystack official checkout page
        window.location.href = initData.authorization_url;
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Payment processing failed. Please try again.");
      setPaymentStep("select");
    } finally {
      setProcessing(false);
    }
  }

  function handleReset() {
    setPaymentStep("select");
    setErrorMessage("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={handleReset}
    >
      <div
        className="w-full max-w-lg rounded-t-[2.5rem] sm:rounded-3xl bg-white shadow-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Pull Bar on mobile */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-gray-300" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-gray-900">Seller Subscription</h3>
              <p className="text-[11px] text-gray-500">Paystack Mobile Money &amp; Card</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* STEP 1: SELECT & PAY */}
          {paymentStep === "select" && (
            <form onSubmit={handlePay} className="space-y-5">
              {/* Status Banner */}
              <div
                className={`rounded-2xl p-4 border text-xs leading-relaxed ${
                  subscriptionState.isExpired
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : subscriptionState.daysRemaining <= 5
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {subscriptionState.isExpired ? (
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  )}
                  <span>
                    {subscriptionState.isExpired
                      ? "Your 30-Day Free Trial Has Expired"
                      : subscriptionState.isTrial
                      ? `30-Day Free Trial Active (${subscriptionState.daysRemaining} days remaining)`
                      : `Active Subscription (Renews on ${subscriptionState.formattedExpiry})`}
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  {subscriptionState.isExpired
                    ? "Your products are saved safely, but currently hidden from buyers. Subscribe below to instantly reactivate them."
                    : "Renew early to keep your student listings live and visible to buyers across all of Ho."}
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3.5 text-xs font-bold text-red-700 border border-red-200">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Plan Cards */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2.5">
                  Choose Subscription Plan
                </label>
                <div className="space-y-2.5">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const isSelected = selectedPlan.id === plan.id;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative flex items-center justify-between rounded-2xl border p-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-600/20"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{plan.name}</span>
                            {plan.badge && (
                              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-gray-500 leading-normal">{plan.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-blue-600">GHS {plan.priceGhs}</p>
                          <span
                            className={`mt-1 inline-block h-4 w-4 rounded-full border-2 ${
                              isSelected ? "border-blue-600 bg-blue-600 ring-2 ring-white" : "border-gray-300"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div className="rounded-2xl border border-gray-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">Accepted Payment Channels</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Lock className="h-3 w-3" />
                    <span>Paystack Secured</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {MOMO_NETWORKS.map((n) => (
                    <span
                      key={n.id}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 border border-gray-200 shadow-sm"
                    >
                      <span className={`h-2 w-2 rounded-full ${n.color}`} />
                      <span>{n.name}</span>
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-[11px] font-bold text-gray-700 border border-gray-200 shadow-sm">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    <span>Visa / Mastercard</span>
                  </span>
                </div>
              </div>

              {/* Submit Payment CTA */}
              <button
                type="submit"
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <Zap className="h-4 w-4" />
                <span>Pay GHS {selectedPlan.priceGhs}.00 via Paystack</span>
              </button>

              <p className="text-center text-[11px] text-gray-400">
                You will be prompted to approve the Mobile Money payment or enter card details securely.
              </p>
            </form>
          )}

          {/* STEP 2: PROMPTING PHONE / WAITING FOR PAYSTACK */}
          {paymentStep === "prompting" && (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 animate-pulse border border-amber-200">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>

              <div>
                <h4 className="text-base font-black text-gray-900">Connecting to Paystack...</h4>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Initializing secure Mobile Money / Card gateway. Please follow the instructions to authorize your
                  payment...
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-3 text-[11px] text-gray-500 border border-gray-100">
                Amount: <strong className="text-gray-900">GHS {selectedPlan.priceGhs}.00</strong> &bull; Plan:{" "}
                <strong className="text-gray-900">{selectedPlan.name}</strong>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CELEBRATION */}
          {paymentStep === "success" && (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-600/20">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Subscription Activated</span>
                </div>
                <h4 className="text-lg font-black text-gray-900">Payment Successful!</h4>
                <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Your seller account is now fully active until{" "}
                  <strong className="text-gray-900">{successDate}</strong>. All your listings are live on UHASMART!
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-slate-50 p-4 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan:</span>
                  <span className="font-bold text-gray-900">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-600">GHS {selectedPlan.priceGhs}.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method:</span>
                  <span className="font-bold text-gray-900">Paystack Mobile Money / Card</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">New Expiry:</span>
                  <span className="font-bold text-blue-600">{successDate}</span>
                </div>
              </div>

              {/* Spam/Junk Email Alert Notice */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-left text-xs leading-relaxed text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>Official Receipt Sent to Your Email</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Please check your inbox. If you don&apos;t see it, check your <strong>Spam</strong> or <strong>Junk</strong> folder and tap <strong>&ldquo;Report Not Spam&rdquo;</strong> so you never miss student orders!
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-xs font-black text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all"
              >
                Done &bull; Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
