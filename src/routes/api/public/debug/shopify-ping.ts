import { createFileRoute } from "@tanstack/react-router";
import { SHOPIFY_STORE_PERMANENT_DOMAIN, SHOPIFY_API_VERSION } from "@/lib/shopify";

function getStoreDomain(): string {
  const envDomain = (process.env.SHOPIFY_STORE_DOMAIN || "").trim();
  if (envDomain) return envDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return SHOPIFY_STORE_PERMANENT_DOMAIN;
}

// Diagnostic endpoint — confirms the SHOPIFY_ADMIN_ACCESS_TOKEN is valid,
// which shop it points to, and which scopes it holds. Read-only.
export const Route = createFileRoute("/api/public/debug/shopify-ping")({
  server: {
    handlers: {
      GET: async () => {
        const token = (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
        if (!token) {
          return Response.json(
            { ok: false, error: "SHOPIFY_ADMIN_ACCESS_TOKEN not set" },
            { status: 500 }
          );
        }
        const domain = getStoreDomain();
        const base = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}`;
        const headers = { "X-Shopify-Access-Token": token };

        async function fetchJSON(url: string) {
          const res = await fetch(url, { headers });
          const text = await res.text();
          let body: unknown = text;
          try { body = JSON.parse(text); } catch { /* keep text */ }
          return { status: res.status, ok: res.ok, body };
        }

        const [shop, scopes] = await Promise.all([
          fetchJSON(`${base}/shop.json`),
          fetchJSON(`https://${domain}/admin/oauth/access_scopes.json`),
        ]);

        return Response.json({
          ok: shop.ok && scopes.ok,
          domain,
          apiVersion: SHOPIFY_API_VERSION,
          shop,
          scopes,
          hint:
            "For order creation you need write_orders, write_customers, read_products, write_draft_orders.",
        });
      },
    },
  },
});
