import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import {
  PAYU_BASE_URL,
  buildPayUFormFields,
  cleanPayUValue,
  formatPayUAmount,
  generateTxnId,
  type PayURequestFields,
} from "@/lib/payu";
import type { PendingOrder } from "@/lib/shopify-admin";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export const Route = createFileRoute("/api/payu/initiate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = cleanPayUValue(process.env.PAYU_MERCHANT_KEY);
        const salt = cleanPayUValue(process.env.PAYU_SALT);
        if (!key || !salt) {
          return new Response("PayU not configured", { status: 500 });
        }

        let body: PendingOrder;
        try {
          body = (await request.json()) as PendingOrder;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!body?.items?.length || !body?.customer?.email) {
          return new Response("Missing items or customer", { status: 400 });
        }

        const amount = formatPayUAmount(
          body.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
        );
        const productinfo =
          body.items.map((i) => cleanPayUValue(`${i.title} x${i.quantity}`)).join(", ").slice(0, 100);
        const txnid = generateTxnId();

        const origin = new URL(request.url).origin;
        const surl = `${origin}/api/payu/callback`;
        const furl = `${origin}/api/payu/callback`;

        const fields: PayURequestFields = {
          key,
          txnid,
          amount,
          productinfo,
          firstname: body.customer.firstName || "Customer",
          email: body.customer.email,
          phone: body.customer.phone,
          surl,
          furl,
          udf1: "",
          udf2: "",
          udf3: "",
          udf4: "",
          udf5: "",
        };
        const payuFields = buildPayUFormFields(fields, salt);

        // Persist pending order in an httpOnly cookie keyed by txnid (10 min)
        setCookie(`payu_pending_${txnid}`, JSON.stringify(body), {
          httpOnly: true,
          secure: true,
          sameSite: "none", // PayU posts back cross-site
          path: "/",
          maxAge: 60 * 15,
        });

        const formInputs: Array<[string, string]> = [
          ["key", payuFields.key],
          ["txnid", payuFields.txnid],
          ["amount", payuFields.amount],
          ["productinfo", payuFields.productinfo],
          ["firstname", payuFields.firstname],
          ["email", payuFields.email],
          ["phone", payuFields.phone],
          ["surl", payuFields.surl],
          ["furl", payuFields.furl],
          ["udf1", payuFields.udf1 || ""],
          ["udf2", payuFields.udf2 || ""],
          ["udf3", payuFields.udf3 || ""],
          ["udf4", payuFields.udf4 || ""],
          ["udf5", payuFields.udf5 || ""],
          ["hash", payuFields.hash],
        ];

        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Redirecting to PayU…</title>
<style>body{font-family:system-ui;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}</style>
</head><body>
<div>Redirecting to secure PayU checkout…</div>
<form id="payuForm" method="post" action="${PAYU_BASE_URL}">
${formInputs.map(([n, v]) => `<input type="hidden" name="${escapeHtml(n)}" value="${escapeHtml(v)}"/>`).join("")}
</form>
<script>document.getElementById('payuForm').submit();</script>
</body></html>`;

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      },
    },
  },
});
