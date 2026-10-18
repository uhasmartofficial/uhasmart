import { NextRequest, NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions";
import { initializePaystackTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, userId, email, sellerName } = body;

    if (!userId || !email || !planId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, email, or planId." },
        { status: 400 }
      );
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription plan selected." }, { status: 400 });
    }

    const reference = `UHA-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uhasmart.com";
    const callbackUrl = `${siteUrl}/seller?payment=success&ref=${reference}`;

    const metadata = {
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.name,
      duration_days: plan.durationDays,
      amount_ghs: plan.priceGhs,
      seller_name: sellerName || "UHASMART Seller",
      custom_fields: [
        { display_name: "Plan Name", variable_name: "plan_name", value: plan.name },
        { display_name: "Seller ID", variable_name: "seller_id", value: userId },
      ],
    };

    const paystackRes = await initializePaystackTransaction({
      email,
      amountGhs: plan.priceGhs,
      reference,
      callbackUrl,
      metadata,
    });

    if (!paystackRes.status || !paystackRes.data) {
      return NextResponse.json(
        { error: paystackRes.message || "Failed to initialize Paystack transaction." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackRes.data.authorization_url,
      access_code: paystackRes.data.access_code,
      reference: paystackRes.data.reference,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "",
      plan,
    });
  } catch (err) {
    console.error("Paystack initialization error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal payment initialization error." },
      { status: 500 }
    );
  }
}
