/**
 * Paystack Ghana Integration Utilities
 */

const PAYSTACK_API_BASE = "https://api.paystack.co";

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number; // in pesewas
    currency: string;
    channel: string;
    customer: {
      email: string;
      phone?: string;
    };
    metadata?: {
      user_id?: string;
      plan_id?: string;
      plan_name?: string;
      duration_days?: number;
      amount_ghs?: number;
      seller_name?: string;
    };
    paid_at?: string;
  };
}

/**
 * Initialize a Paystack transaction (Server-Side)
 */
export async function initializePaystackTransaction({
  email,
  amountGhs,
  reference,
  callbackUrl,
  metadata,
}: {
  email: string;
  amountGhs: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not configured.");
  }

  // Paystack expects amount in pesewas (1 GHS = 100 pesewas)
  const amountPesewas = Math.round(amountGhs * 100);

  const res = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountPesewas,
      currency: "GHS",
      reference,
      channels: ["mobile_money", "card"],
      callback_url: callbackUrl,
      metadata,
    }),
  });

  const data = await res.json();
  return data as PaystackInitResponse;
}

/**
 * Verify a Paystack transaction by reference (Server-Side)
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not configured.");
  }

  const res = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
    },
    cache: "no-store",
  });

  const data = await res.json();
  return data as PaystackVerifyResponse;
}
