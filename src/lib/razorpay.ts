import { createHmac, timingSafeEqual } from "crypto";

export const RAZORPAY_API = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export async function createRazorpayOrder(args: {
  amount: number; // in paise
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay not configured");
  if (!Number.isFinite(args.amount) || args.amount < 100) {
    throw new Error("Amount must be >= 100 paise");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(args.amount),
      currency: args.currency,
      receipt: args.receipt,
      notes: args.notes,
      payment_capture: 1,
    }),
  });
  const json = (await res.json()) as RazorpayOrder & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(`Razorpay order error ${res.status}: ${json?.error?.description || JSON.stringify(json)}`);
  }
  return json;
}

export function verifyRazorpaySignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(args.signature || ""), "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function generateReceipt(): string {
  return `AUD${Date.now()}${Math.floor(Math.random() * 10000)}`;
}
