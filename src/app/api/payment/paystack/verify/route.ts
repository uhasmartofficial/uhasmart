import { NextRequest, NextResponse } from "next/server";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionPaymentConfirmation } from "@/lib/email";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reference, userId: bodyUserId, planId: bodyPlanId, sellerName: bodySellerName, userEmail: bodyEmail } = body;

    if (!reference) {
      return NextResponse.json({ error: "Transaction reference is required." }, { status: 400 });
    }

    // 1. Verify with Paystack API
    const verifyRes = await verifyPaystackTransaction(reference);

    if (!verifyRes.status || !verifyRes.data) {
      return NextResponse.json(
        { error: verifyRes.message || "Unable to verify transaction with Paystack." },
        { status: 400 }
      );
    }

    const payData = verifyRes.data;

    if (payData.status !== "success") {
      return NextResponse.json(
        { error: `Transaction status is ${payData.status}. Payment has not been completed.` },
        { status: 400 }
      );
    }

    // 2. Extract verified payment metadata (robust parsing for objects or strings)
    let metadata: Record<string, unknown> = {};
    if (typeof payData.metadata === "string") {
      try {
        metadata = JSON.parse(payData.metadata) as Record<string, unknown>;
      } catch {
        metadata = {};
      }
    } else if (payData.metadata && typeof payData.metadata === "object") {
      metadata = payData.metadata as Record<string, unknown>;
    }

    let customFieldUserId: string | undefined;
    let customFieldPlanName: string | undefined;
    const customFields = metadata.custom_fields;
    if (Array.isArray(customFields)) {
      customFieldUserId = (customFields.find((f: { variable_name?: string }) => f?.variable_name === "seller_id") as { value?: string } | undefined)?.value;
      customFieldPlanName = (customFields.find((f: { variable_name?: string }) => f?.variable_name === "plan_name") as { value?: string } | undefined)?.value;
    }

    const userId = (metadata.user_id as string | undefined) || customFieldUserId || bodyUserId;
    const metaPlanName = metadata.plan_name as string | undefined;
    const matchedPlan = SUBSCRIPTION_PLANS.find(p => p.id === bodyPlanId || p.name === metaPlanName);

    const planName = metaPlanName || customFieldPlanName || matchedPlan?.name || "1 Month Standard";
    const durationDays = Number(metadata.duration_days) || matchedPlan?.durationDays || 30;
    const amountGhs = Number(metadata.amount_ghs) || matchedPlan?.priceGhs || Math.round(payData.amount / 100);
    const sellerName = metadata.seller_name || bodySellerName || "UHASMART Seller";
    const customerEmail = payData.customer?.email || bodyEmail || "";
    const paymentMethod = `Paystack ${payData.channel ? payData.channel.toUpperCase() : "Mobile Money"}`;

    if (!userId) {
      return NextResponse.json(
        { error: "Payment verified, but seller identifier (user_id) was missing in metadata." },
        { status: 400 }
      );
    }

    // 3. Connect to Supabase to activate subscription
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured on the server.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate new expiration date
    const newExpiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // Check if payment was already recorded to prevent duplicate activations
    const { data: existingPayment } = await supabase
      .from("subscription_payments")
      .select("id, status")
      .eq("reference", reference)
      .maybeSingle();

    if (!existingPayment) {
      // Attempt RPC activation first
      const { data: rpcData, error: rpcErr } = await supabase.rpc("activate_seller_subscription_for_user", {
        p_user_id: userId,
        p_plan_name: planName,
        p_duration_days: durationDays,
        p_amount_ghs: amountGhs,
        p_payment_method: paymentMethod,
        p_momo_number: payData.customer?.phone || "Paystack",
        p_momo_network: payData.channel || "paystack",
        p_reference: reference,
      });

      if (rpcErr || !rpcData?.success) {
        // Fallback: direct table update
        await Promise.all([
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
            momo_number: payData.customer?.phone || "Paystack",
            momo_network: payData.channel || "paystack",
            reference,
            status: "success",
          }),
        ]);
      }

      // 4. Dispatch official branded payment confirmation email
      if (customerEmail) {
        const formattedExpiry = new Date(newExpiryDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        void sendSubscriptionPaymentConfirmation({
          to: customerEmail,
          sellerName,
          planName,
          amountGhs,
          paymentMethod,
          reference,
          expiryDate: formattedExpiry,
        }).catch((emailErr) => {
          console.warn("[Paystack Verify] Background receipt email notice:", emailErr);
        });
      }
    }

    return NextResponse.json({
      success: true,
      reference,
      planName,
      amountGhs,
      newExpiry: newExpiryDate,
      message: `Payment of GHS ${amountGhs}.00 verified via Paystack. Your seller subscription is now active!`,
    });
  } catch (err) {
    console.error("Paystack verification error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal verification error." },
      { status: 500 }
    );
  }
}
