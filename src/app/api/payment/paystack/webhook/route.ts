import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendSubscriptionPaymentConfirmation } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify HMAC SHA512 signature
    const hash = crypto
      .createHmac("sha512", secretKey.trim())
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.warn("[Paystack Webhook] Invalid signature received.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    if (event === "charge.success" && data) {
      const reference = data.reference;

      let metadata: Record<string, unknown> = {};
      if (typeof data.metadata === "string") {
        try {
          metadata = JSON.parse(data.metadata) as Record<string, unknown>;
        } catch {
          metadata = {};
        }
      } else if (data.metadata && typeof data.metadata === "object") {
        metadata = data.metadata as Record<string, unknown>;
      }

      let customFieldUserId: string | undefined;
      let customFieldPlanName: string | undefined;
      const customFields = metadata.custom_fields;
      if (Array.isArray(customFields)) {
        customFieldUserId = (customFields.find((f: { variable_name?: string }) => f?.variable_name === "seller_id") as { value?: string } | undefined)?.value;
        customFieldPlanName = (customFields.find((f: { variable_name?: string }) => f?.variable_name === "plan_name") as { value?: string } | undefined)?.value;
      }

      const userId = (metadata.user_id as string | undefined) || customFieldUserId;
      const planName = (metadata.plan_name as string | undefined) || customFieldPlanName || "Seller Subscription";
      const durationDays = Number(metadata.duration_days) || 30;
      const amountGhs = Number(metadata.amount_ghs) || Math.round(data.amount / 100);
      const sellerName = (metadata.seller_name as string | undefined) || "Seller";
      const customerEmail = data.customer?.email || "";
      const paymentMethod = `Paystack ${data.channel ? data.channel.toUpperCase() : "Mobile Money"}`;

      if (userId && reference) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);

          // Check if already processed
          const { data: existingPayment } = await supabase
            .from("subscription_payments")
            .select("id")
            .eq("reference", reference)
            .maybeSingle();

          if (!existingPayment) {
            const newExpiryDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

            // Run RPC activation
            const { error: rpcErr } = await supabase.rpc("activate_seller_subscription_for_user", {
              p_user_id: userId,
              p_plan_name: planName,
              p_duration_days: durationDays,
              p_amount_ghs: amountGhs,
              p_payment_method: paymentMethod,
              p_momo_number: data.customer?.phone || "Paystack",
              p_momo_network: data.channel || "paystack",
              p_reference: reference,
            });

            if (rpcErr) {
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
                  momo_number: data.customer?.phone || "Paystack",
                  momo_network: data.channel || "paystack",
                  reference,
                  status: "success",
                }),
              ]);
            }

            // Dispatch confirmation receipt email
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
              }).catch((e) => console.warn("[Paystack Webhook] Receipt email error:", e));
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler error" },
      { status: 500 }
    );
  }
}
