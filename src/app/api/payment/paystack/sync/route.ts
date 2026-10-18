import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email required" }, { status: 400 });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured" }, { status: 500 });
    }

    // 1. Fetch latest successful transactions from Paystack
    const res = await fetch("https://api.paystack.co/transaction?perPage=25&status=success", {
      headers: {
        Authorization: `Bearer ${secretKey.trim()}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const json = await res.json();
    if (!json.status || !Array.isArray(json.data)) {
      return NextResponse.json({ found: false, message: "No transactions found on Paystack." });
    }

    // 2. Search for the transaction belonging to this user
    interface PaystackTransaction {
      reference: string;
      amount: number;
      channel: string;
      status: string;
      paid_at?: string;
      customer?: {
        email?: string;
        phone?: string;
      };
      metadata?: unknown;
    }

    const userEmailNorm = (email || "").trim().toLowerCase();

    const matchingTx = (json.data as PaystackTransaction[]).find((tx) => {
      // Check customer email
      if (userEmailNorm && tx.customer?.email?.trim().toLowerCase() === userEmailNorm) {
        return true;
      }

      // Check metadata user_id
      let meta: Record<string, unknown> = {};
      if (typeof tx.metadata === "string") {
        try {
          meta = JSON.parse(tx.metadata) as Record<string, unknown>;
        } catch {
          meta = {};
        }
      } else if (tx.metadata && typeof tx.metadata === "object") {
        meta = tx.metadata as Record<string, unknown>;
      }

      if (userId && meta.user_id === userId) {
        return true;
      }

      // Check custom fields
      if (Array.isArray(meta.custom_fields) && userId) {
        const foundId = (meta.custom_fields.find((f: { variable_name?: string }) => f?.variable_name === "seller_id") as { value?: string } | undefined)?.value;
        if (foundId === userId) return true;
      }

      return false;
    });

    if (!matchingTx) {
      return NextResponse.json({ found: false, message: "No recent successful payment found on Paystack for this account." });
    }

    // 3. Extract transaction details
    let meta: Record<string, unknown> = {};
    if (typeof matchingTx.metadata === "string") {
      try {
        meta = JSON.parse(matchingTx.metadata) as Record<string, unknown>;
      } catch {
        meta = {};
      }
    } else if (matchingTx.metadata && typeof matchingTx.metadata === "object") {
      meta = matchingTx.metadata as Record<string, unknown>;
    }

    const amountGhs = Math.round(matchingTx.amount / 100);
    const matchedPlan = SUBSCRIPTION_PLANS.find((p) => p.priceGhs === amountGhs || p.name === meta.plan_name) || SUBSCRIPTION_PLANS[0];
    const planName = (meta.plan_name as string | undefined) || matchedPlan.name;
    const durationDays = Number(meta.duration_days) || matchedPlan.durationDays;
    const reference = matchingTx.reference;
    const paymentMethod = `Paystack ${matchingTx.channel ? matchingTx.channel.toUpperCase() : "Mobile Money"}`;

    const paidAt = matchingTx.paid_at ? new Date(matchingTx.paid_at) : new Date();
    const newExpiryDate = new Date(paidAt.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 4. Activate in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Attempt RPC first
      const { error: rpcErr } = await supabase.rpc("activate_seller_subscription_for_user", {
        p_user_id: userId,
        p_plan_name: planName,
        p_duration_days: durationDays,
        p_amount_ghs: amountGhs,
        p_payment_method: paymentMethod,
        p_momo_number: matchingTx.customer?.phone || "Paystack",
        p_momo_network: matchingTx.channel || "paystack",
        p_reference: reference,
      });

      if (rpcErr) {
        await Promise.allSettled([
          supabase
            .from("profiles")
            .update({
              role: "seller",
              subscription_status: "active",
              subscription_tier: planName,
              subscription_expires_at: newExpiryDate,
              subscription_reminder_sent: false,
            })
            .eq("id", userId),
          supabase.from("subscription_payments").insert({
            seller_id: userId,
            amount_ghs: amountGhs,
            plan_name: planName,
            duration_days: durationDays,
            payment_method: paymentMethod,
            momo_number: matchingTx.customer?.phone || "Paystack",
            momo_network: matchingTx.channel || "paystack",
            reference,
            status: "success",
          }),
        ]);
      }
    }

    return NextResponse.json({
      found: true,
      reference,
      planName,
      amountGhs,
      newExpiry: newExpiryDate,
      message: `Verified previous Paystack payment (${reference}) for ${planName}. Subscription activated!`,
    });
  } catch (err) {
    console.error("Paystack sync error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync error" }, { status: 500 });
  }
}
