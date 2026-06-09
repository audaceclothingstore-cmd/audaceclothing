// Server-only: verify line-item prices against Shopify's authoritative Storefront API.
// Prevents client-side price manipulation (paying ₹1 for any item).
import {
  SHOPIFY_STOREFRONT_URL,
  SHOPIFY_STOREFRONT_TOKEN,
} from "./shopify";
import type { PendingOrder } from "./shopify-admin";

const VARIANT_PRICES_QUERY = `
  query VariantPrices($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        price { amount currencyCode }
      }
    }
  }
`;

interface VariantNode {
  id: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
}

/**
 * Returns a PendingOrder with each line's `price` replaced by the authoritative
 * Shopify variant price. Throws if any variant is missing, unavailable, or
 * if the request fails.
 */
export async function verifyAndRepriceOrder(pending: PendingOrder): Promise<PendingOrder> {
  if (!pending?.items?.length) throw new Error("No items to verify");

  const ids = Array.from(new Set(pending.items.map((i) => i.variantId)));
  for (const id of ids) {
    if (!/^gid:\/\/shopify\/ProductVariant\/\d+$/.test(id)) {
      throw new Error(`Invalid variant id: ${id}`);
    }
  }

  const res = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query: VARIANT_PRICES_QUERY, variables: { ids } }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Storefront price lookup failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    data?: { nodes?: (VariantNode | null)[] };
    errors?: Array<{ message: string }>;
  };
  if (data.errors?.length) {
    throw new Error(`Storefront errors: ${data.errors.map((e) => e.message).join(", ")}`);
  }
  const nodes = data.data?.nodes ?? [];
  const byId = new Map<string, VariantNode>();
  for (const n of nodes) {
    if (n && n.id) byId.set(n.id, n);
  }

  const expectedCurrency = pending.currency || "INR";

  const items = pending.items.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0 || line.quantity > 50) {
      throw new Error(`Invalid quantity for ${line.variantId}`);
    }
    const v = byId.get(line.variantId);
    if (!v) throw new Error(`Variant not found: ${line.variantId}`);
    if (!v.availableForSale) throw new Error(`Variant not available: ${line.variantId}`);
    if (v.price.currencyCode !== expectedCurrency) {
      throw new Error(
        `Currency mismatch for ${line.variantId}: expected ${expectedCurrency}, got ${v.price.currencyCode}`
      );
    }
    return { ...line, price: v.price.amount };
  });

  return { ...pending, items, currency: expectedCurrency };
}
