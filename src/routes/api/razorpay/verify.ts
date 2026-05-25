import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { createShopifyOrder, type PendingOrder } from "@/lib/shopify-admin";

interface VerifyBody {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
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
        if (!orderId || !paymentId || !signature) {
          return Response.json({ error: "Missing fields" }, { status: 400 });
        }

        const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
        if (!ok) {
          console.error("Razorpay signature mismatch", { orderId, paymentId });
          return Response.json({ error: "Invalid signature" }, { status: 400 });
        }

        const raw = getCookie(`rzp_pending_${orderId}`);
        if (!raw) {
          return Response.json(
            { error: "Session expired", verified: true },
            { status: 410 }
          );
        }

        let pending: PendingOrder;
        try {
          pending = JSON.parse(raw) as PendingOrder;
        } catch {
          return Response.json({ error: "Bad session" }, { status: 400 });
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
            order_name: order.name,
            order_id: orderId,
            payment_id: paymentId,
          });
        } catch (e) {
          console.error("Shopify order creation failed (razorpay)", e);
          return Response.json(
            { error: "Order creation failed", verified: true },
            { status: 500 }
          );
        }
      },
    },
  },
});
