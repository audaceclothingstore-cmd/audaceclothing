import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { createRazorpayOrder, generateReceipt, getPublicKeyId } from "@/lib/razorpay";
import type { PendingOrder } from "@/lib/shopify-admin";

export const Route = createFileRoute("/api/razorpay/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let keyId: string;
        try {
          keyId = getPublicKeyId();
        } catch (e) {
          console.error("[razorpay] create-order config error", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Razorpay not configured" },
            { status: 500 }
          );
        }


        let body: PendingOrder;
        try {
          body = (await request.json()) as PendingOrder;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (!body?.items?.length || !body?.customer?.email) {
          return Response.json({ error: "Missing items or customer" }, { status: 400 });
        }

        const rupees = body.items.reduce(
          (s, i) => s + Number(i.price) * i.quantity,
          0
        );
        const amountPaise = Math.round(rupees * 100);
        if (amountPaise < 100) {
          return Response.json({ error: "Amount below minimum" }, { status: 400 });
        }

        const receipt = generateReceipt();

        try {
          const order = await createRazorpayOrder({
            amount: amountPaise,
            currency: body.currency || "INR",
            receipt,
            notes: {
              email: body.customer.email,
              phone: body.customer.phone || "",
            },
          });

          setCookie(`rzp_pending_${order.id}`, JSON.stringify(body), {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 15,
          });

          return Response.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            key_id: keyId,
          });
        } catch (e) {
          console.error("Razorpay create-order failed", e);
          return Response.json(
            { error: e instanceof Error ? e.message : "Order creation failed" },
            { status: 500 }
          );
        }
      },
    },
  },
});
