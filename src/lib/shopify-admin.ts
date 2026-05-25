// Shopify Admin API helper (server-only)
import { SHOPIFY_STORE_PERMANENT_DOMAIN, SHOPIFY_API_VERSION } from "./shopify";

export interface PendingOrderLine {
  variantId: string; // GID like gid://shopify/ProductVariant/123
  quantity: number;
  price: string;
  title: string;
}

export interface PendingOrderCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: string;
}

export interface PendingOrder {
  items: PendingOrderLine[];
  customer: PendingOrderCustomer;
  currency: string;
}

function extractNumericId(gid: string): string {
  const m = gid.match(/(\d+)(?!.*\d)/);
  return m ? m[1] : gid;
}

export async function createShopifyOrder(
  pending: PendingOrder,
  payu: { txnid: string; mihpayid: string; amount: string; mode: string }
) {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!token) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN not configured");

  const url = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;

  const body = {
    order: {
      line_items: pending.items.map((i) => ({
        variant_id: Number(extractNumericId(i.variantId)),
        quantity: i.quantity,
        price: i.price,
      })),
      customer: {
        first_name: pending.customer.firstName,
        last_name: pending.customer.lastName,
        email: pending.customer.email,
        phone: pending.customer.phone,
      },
      email: pending.customer.email,
      phone: pending.customer.phone,
      billing_address: {
        first_name: pending.customer.firstName,
        last_name: pending.customer.lastName,
        address1: pending.customer.address1,
        address2: pending.customer.address2 || "",
        city: pending.customer.city,
        province: pending.customer.province,
        zip: pending.customer.zip,
        country: pending.customer.country,
        phone: pending.customer.phone,
      },
      shipping_address: {
        first_name: pending.customer.firstName,
        last_name: pending.customer.lastName,
        address1: pending.customer.address1,
        address2: pending.customer.address2 || "",
        city: pending.customer.city,
        province: pending.customer.province,
        zip: pending.customer.zip,
        country: pending.customer.country,
        phone: pending.customer.phone,
      },
      financial_status: "paid",
      currency: pending.currency,
      transactions: [
        {
          kind: "sale",
          status: "success",
          amount: payu.amount,
          gateway: "PayU",
          authorization: payu.mihpayid,
          source_name: "web",
        },
      ],
      note: `PayU txnid: ${payu.txnid} | mihpayid: ${payu.mihpayid} | mode: ${payu.mode}`,
      tags: "payu, custom-storefront",
      send_receipt: true,
      send_fulfillment_receipt: false,
      inventory_behaviour: "decrement_obeying_policy",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Shopify Admin error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.order as { id: number; order_number: number; name: string };
}
