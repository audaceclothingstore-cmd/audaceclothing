import { createHmac, timingSafeEqual } from "crypto";

export const RAZORPAY_API = "https://api.razorpay.com/v1";

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

function getCreds() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay not configured (missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }
  if (keyId.startsWith("rzp_test_")) {
    throw new Error("Razorpay TEST key detected. Set LIVE rzp_live_ credentials.");
  }
  return { keyId, keySecret };
}

export async function createRazorpayOrder(args: {
  amount: number; // in paise
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const { keyId, keySecret } = getCreds();
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
      // Auto-capture payment immediately on success (LIVE mode)
      payment_capture: 1,
    }),
  });
  const json = (await res.json()) as RazorpayOrder & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(`Razorpay order error ${res.status}: ${json?.error?.description || JSON.stringify(json)}`);
  }
  console.log("[razorpay] order created", { id: json.id, mode: keyId.slice(0, 8), amount: json.amount });
  return json;
}

export function getPublicKeyId(): string {
  return getCreds().keyId;
}

export function verifyRazorpaySignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  let secret: string;
  try {
    secret = getCreds().keySecret;
  } catch (e) {
    console.error("[razorpay] verify: missing creds", e);
    return false;
  }

  const sig = String(args.signature || "").trim().toLowerCase();
  if (!args.orderId || !args.paymentId || !sig) {
    console.error("[razorpay] verify: missing fields", {
      hasOrder: !!args.orderId,
      hasPayment: !!args.paymentId,
      hasSig: !!sig,
    });
    return false;
  }

  const payload = `${args.orderId}|${args.paymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  if (expected.length !== sig.length) {
    console.error("[razorpay] verify: length mismatch", {
      expectedLen: expected.length,
      gotLen: sig.length,
      orderId: args.orderId,
      paymentId: args.paymentId,
    });
    return false;
  }

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    const ok = timingSafeEqual(a, b);
    if (!ok) {
      console.error("[razorpay] verify: signature mismatch", {
        orderId: args.orderId,
        paymentId: args.paymentId,
        expectedPrefix: expected.slice(0, 8),
        gotPrefix: sig.slice(0, 8),
      });
    }
    return ok;
  } catch (e) {
    console.error("[razorpay] verify: compare threw", e);
    return false;
  }
}

export function generateReceipt(): string {
  return `AUD${Date.now()}${Math.floor(Math.random() * 10000)}`;
}
