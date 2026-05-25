import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { verifyRazorpaySignature, RAZORPAY_API } from "@/lib/razorpay";
import { createShopifyOrder, type PendingOrder } from "@/lib/shopify-admin";

interface VerifyBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  status: string; // 'captured' | 'authorized' | 'failed' | ...
  amount: number;
  currency: string;
  method?: string;
}

async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment | null> {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) return null;
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) {
      console.error("[razorpay] fetch payment failed", res.status, await res.text());
      return null;
    }
    return (await res.json()) as RazorpayPayment;
  } catch (e) {
    console.error("[razorpay] fetch payment threw", e);
    return null;
  }
}

export const Route = createFileRoute("/api/razorpay/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: VerifyBody;
        try {
          body = (await request.json()) as VerifyBody;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const orderId = body.razorpay_order_id;
        const paymentId = body.razorpay_payment_id;
        const signature = body.razorpay_signature;

        console.log("[razorpay] verify request", {
          hasOrder: !!orderId,
          hasPayment: !!paymentId,
          hasSig: !!signature,
          orderId,
          paymentId,
          sigPrefix: signature?.slice(0, 8),
        });

        if (!orderId || !paymentId) {
          return Response.json({ error: "Missing order_id or payment_id" }, { status: 400 });
        }

        // 1. Try HMAC signature verification first
        let verified = false;
        if (signature) {
          verified = verifyRazorpaySignature({ orderId, paymentId, signature });
        }

        // 2. Fallback: confirm with Razorpay API that payment is captured and tied to this order.
        //    This protects against signature edge cases (whitespace, header mangling) when the
        //    customer's money has actually been taken.
        let captured = false;
        if (!verified) {
          const payment = await fetchRazorpayPayment(paymentId);
          if (
            payment &&
            payment.order_id === orderId &&
            (payment.status === "captured" || payment.status === "authorized")
          ) {
            captured = true;
            console.log("[razorpay] signature failed but payment confirmed captured via API", {
              orderId,
              paymentId,
              status: payment.status,
            });
          } else {
            console.error("[razorpay] verify failed — signature bad AND payment not captured", {
              orderId,
              paymentId,
              paymentStatus: payment?.status,
              paymentOrderId: payment?.order_id,
            });
            return Response.json(
              { error: "Payment could not be verified", verified: false },
              { status: 400 }
            );
          }
        }

        const ok = verified || captured;
        if (!ok) {
          return Response.json({ error: "Verification failed", verified: false }, { status: 400 });
        }

        // 3. Try to create the Shopify order from pending cookie. If that fails, still tell the
        //    client the payment succeeded so the user is NOT shown PAYMENT FAILED after being
        //    debited. The order will need manual reconciliation in that case.
        const raw = getCookie(`rzp_pending_${orderId}`);
        if (!raw) {
          console.warn("[razorpay] pending cookie missing — payment OK but cannot place Shopify order automatically", { orderId });
          return Response.json({
            success: true,
            verified: true,
            order_name: "",
            order_id: orderId,
            payment_id: paymentId,
            warning: "Order will be created manually. Payment is confirmed.",
          });
        }

        let pending: PendingOrder;
        try {
          pending = JSON.parse(raw) as PendingOrder;
        } catch {
          return Response.json({
            success: true,
            verified: true,
            order_name: "",
            order_id: orderId,
            payment_id: paymentId,
            warning: "Order will be created manually. Payment is confirmed.",
          });
        }

        try {
          const amountRupees = pending.items
            .reduce((s, i) => s + Number(i.price) * i.quantity, 0)
            .toFixed(2);
          const order = await createShopifyOrder(pending, {
            txnid: orderId,
            mihpayid: paymentId,
            amount: amountRupees,
            mode: "razorpay",
          });
          deleteCookie(`rzp_pending_${orderId}`, { path: "/" });
          return Response.json({
            success: true,
            verified: true,
            order_name: order.name,
            order_id: orderId,
            payment_id: paymentId,
          });
        } catch (e) {
          console.error("Shopify order creation failed (razorpay) — payment IS captured", e);
          // Payment succeeded — don't show failure to customer.
          return Response.json({
            success: true,
            verified: true,
            order_name: "",
            order_id: orderId,
            payment_id: paymentId,
            warning: "Payment confirmed. Order is being processed.",
          });
        }
      },
    },
  },
});
