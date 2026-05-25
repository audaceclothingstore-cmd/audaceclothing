import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import { cleanPayUValue, verifyPayUResponseHash } from "@/lib/payu";
import { createShopifyOrder, type PendingOrder } from "@/lib/shopify-admin";

export const Route = createFileRoute("/api/payu/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const salt = cleanPayUValue(process.env.PAYU_SALT);
        if (!salt) return new Response("PayU not configured", { status: 500 });

        const form = await request.formData();
        const params: Record<string, string> = {};
        for (const [k, v] of form.entries()) params[k] = String(v);

        const origin = new URL(request.url).origin;
        const txnid = params.txnid || "";
        const status = params.status || "";

        const redirect = (path: string) =>
          new Response(null, { status: 303, headers: { Location: `${origin}${path}` } });

        if (!verifyPayUResponseHash(params, salt)) {
          console.error("PayU hash mismatch", { txnid, status });
          return redirect(`/order/failure?reason=hash_mismatch&txnid=${encodeURIComponent(txnid)}`);
        }

        if (status !== "success") {
          deleteCookie(`payu_pending_${txnid}`, { path: "/" });
          return redirect(
            `/order/failure?reason=${encodeURIComponent(status || "failed")}&txnid=${encodeURIComponent(txnid)}`
          );
        }

        // Load pending order
        const raw = getCookie(`payu_pending_${txnid}`);
        if (!raw) {
          console.error("PayU pending order cookie missing", { txnid });
          return redirect(`/order/failure?reason=session_expired&txnid=${encodeURIComponent(txnid)}`);
        }

        let pending: PendingOrder;
        try {
          pending = JSON.parse(raw) as PendingOrder;
        } catch {
          return redirect(`/order/failure?reason=bad_session&txnid=${encodeURIComponent(txnid)}`);
        }

        try {
          const order = await createShopifyOrder(pending, {
            txnid,
            mihpayid: params.mihpayid || "",
            amount: params.amount || "",
            mode: params.mode || "",
          });
          deleteCookie(`payu_pending_${txnid}`, { path: "/" });
          return redirect(
            `/order/success?order=${encodeURIComponent(order.name)}&txnid=${encodeURIComponent(txnid)}`
          );
        } catch (e) {
          console.error("Shopify order creation failed", e);
          return redirect(
            `/order/failure?reason=order_creation_failed&txnid=${encodeURIComponent(txnid)}`
          );
        }
      },
    },
  },
});
