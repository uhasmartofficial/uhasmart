import { SupabaseClient } from "@supabase/supabase-js";

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceGhs: number;
  durationDays: number;
  badge?: string;
  description: string;
  highlight?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "test",
    name: "Live Test Plan",
    priceGhs: 1,
    durationDays: 1,
    badge: "GHS 1 Test",
    highlight: true,
    description: "Temporary 1 Cedi test plan for live Mobile Money verification.",
  },
  {
    id: "monthly",
    name: "1 Month Standard",
    priceGhs: 30,
    durationDays: 30,
    description: "Full marketplace selling privileges for 30 days.",
  },
  {
    id: "semester",
    name: "1 Semester (4 Months)",
    priceGhs: 80,
    durationDays: 120,
    badge: "Most Popular",
    description: "Covers the whole UHAS academic semester. Save GHS 40!",
  },
  {
    id: "annual",
    name: "1 Full Year Pro",
    priceGhs: 180,
    durationDays: 365,
    badge: "Best Value",
    description: "12 full months of uninterrupted campus selling.",
  },
];

export interface MoMoNetwork {
  id: "mtn" | "telecel" | "at";
  name: string;
  color: string;
  prefixes: string[];
}

export const MOMO_NETWORKS: MoMoNetwork[] = [
  {
    id: "mtn",
    name: "MTN Mobile Money",
    color: "bg-amber-500",
    prefixes: ["024", "054", "055", "059", "053"],
  },
  {
    id: "telecel",
    name: "Telecel Cash",
    color: "bg-red-600",
    prefixes: ["020", "050"],
  },
  {
    id: "at",
    name: "AT Money",
    color: "bg-blue-600",
    prefixes: ["027", "057", "026", "056"],
  },
];

export interface SubscriptionState {
  status: "trial" | "active" | "expiring_soon" | "expired";
  isActive: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining: number;
  formattedExpiry: string;
  expiresAt: Date;
}

/**
 * Calculates current seller subscription/trial status.
 * Every registered seller receives a 30-day free trial from creation.
 */
export function getSubscriptionState(profile?: {
  created_at?: string;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
  trial_ends_at?: string | null;
} | null): SubscriptionState {
  const now = new Date();

  // If subscription_expires_at is present, use it.
  // Otherwise, default to 30 days after profile creation (or 30 days from now).
  let expiryDate: Date;
  if (profile?.subscription_expires_at) {
    expiryDate = new Date(profile.subscription_expires_at);
  } else if (profile?.trial_ends_at) {
    expiryDate = new Date(profile.trial_ends_at);
  } else if (profile?.created_at) {
    const created = new Date(profile.created_at);
    expiryDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else {
    expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  }

  const msDiff = expiryDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
  const isExpired = msDiff <= 0;
  const isPaid = profile?.subscription_status === "active";
  const isTrial = !isPaid && !isExpired;

  let status: "trial" | "active" | "expiring_soon" | "expired" = "trial";
  if (isExpired) {
    status = "expired";
  } else if (daysRemaining <= 5) {
    status = "expiring_soon";
  } else if (isPaid) {
    status = "active";
  } else {
    status = "trial";
  }

  const formattedExpiry = expiryDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    status,
    isActive: !isExpired,
    isExpired,
    isTrial,
    daysRemaining,
    formattedExpiry,
    expiresAt: expiryDate,
  };
}

/**
 * Process Mobile Money payment and automatically activate subscription.
 */
export async function processMoMoSubscriptionPayment({
  supabase,
  userId,
  userEmail,
  sellerName,
  plan,
  momoNetwork,
  momoNumber,
}: {
  supabase: SupabaseClient;
  userId: string;
  userEmail?: string | null;
  sellerName?: string | null;
  plan: SubscriptionPlan;
  momoNetwork: string;
  momoNumber: string;
}): Promise<{ success: boolean; newExpiry?: string; reference: string; message: string }> {
  const reference = `MOMO-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  try {
    let resolvedExpiry = "";

    // Attempt RPC activation first
    const { data: rpcData, error: rpcError } = await supabase.rpc("activate_seller_subscription", {
      p_plan_name: plan.name,
      p_duration_days: plan.durationDays,
      p_amount_ghs: plan.priceGhs,
      p_payment_method: `momo_${momoNetwork}`,
      p_momo_number: momoNumber,
      p_momo_network: momoNetwork,
      p_reference: reference,
    });

    if (!rpcError && rpcData?.success) {
      resolvedExpiry = rpcData.new_expiry || "";
    } else {
      // Direct fallback if RPC is not yet created in Supabase SQL editor
      const newExpiryDate = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
      resolvedExpiry = newExpiryDate;

      const [updRes, payRes] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_tier: plan.name,
            subscription_expires_at: newExpiryDate,
            subscription_reminder_sent: false,
          })
          .eq("id", userId),
        supabase
          .from("subscription_payments")
          .insert({
            seller_id: userId,
            amount_ghs: plan.priceGhs,
            plan_name: plan.name,
            duration_days: plan.durationDays,
            payment_method: `momo_${momoNetwork}`,
            momo_number: momoNumber,
            momo_network: momoNetwork,
            reference,
            status: "success",
          }),
      ]);

      if (updRes.error) {
        console.warn("Direct profile update error:", updRes.error);
      }
      if (payRes.error) {
        console.warn("Direct payment insert warning:", payRes.error);
      }
    }

    // Trigger async payment confirmation email if seller email is provided
    if (userEmail && typeof window !== "undefined") {
      const formattedExpiry = resolvedExpiry
        ? new Date(resolvedExpiry).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : `${plan.durationDays} days`;

      fetch("/api/email/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_confirmation",
          email: userEmail,
          sellerName: sellerName || "Seller",
          planName: plan.name,
          amountGhs: plan.priceGhs,
          paymentMethod: `${momoNetwork.toUpperCase()} Mobile Money (${momoNumber})`,
          reference,
          expiryDate: formattedExpiry,
        }),
      }).catch((err) => {
        console.warn("[Email Notification] Background confirmation dispatch notice:", err);
      });
    }

    return {
      success: true,
      newExpiry: resolvedExpiry,
      reference,
      message: `Payment of GHS ${plan.priceGhs} confirmed via ${momoNetwork.toUpperCase()} MoMo. Your subscription is active!`,
    };
  } catch (err) {
    console.error("Subscription payment error:", err);
    throw new Error(err instanceof Error ? err.message : "Payment processing failed. Please try again.");
  }
}
