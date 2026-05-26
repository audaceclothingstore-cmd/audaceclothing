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

function getStoreDomain(): string {
  const envDomain = (process.env.SHOPIFY_STORE_DOMAIN || "").trim();
  if (envDomain) {
    // strip protocol and trailing slash if user pasted a URL
    return envDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return SHOPIFY_STORE_PERMANENT_DOMAIN;
}

export async function createShopifyOrder(
  pending: PendingOrder,
  payment: { txnid: string; mihpayid: string; amount: string; mode: string }
) {
  const token = (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("SHOPIFY_ADMIN_ACCESS_TOKEN not configured");

  const domain = getStoreDomain();
  const url = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/orders.json`;

  console.log("[shopify] creating order", {
    domain,
    apiVersion: SHOPIFY_API_VERSION,
    razorpay_order_id: payment.txnid,
    razorpay_payment_id: payment.mihpayid,
    amount: payment.amount,
    currency: pending.currency,
    items: pending.items.length,
    customerEmail: pending.customer.email,
  });

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
          amount: payment.amount,
          gateway: payment.mode === "razorpay" ? "Razorpay" : "PayU",
          authorization: payment.mihpayid,
          source_name: "web",
        },
      ],
      note: `${payment.mode} txn: ${payment.txnid} | payment_id: ${payment.mihpayid}`,
      tags: `${payment.mode}, custom-storefront`,
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

  const text = await res.text();
  let json: { order?: { id: number; order_number: number; name: string; customer?: { id: number } }; errors?: unknown } = {};
  try {
    json = JSON.parse(text);
  } catch {
    console.error("[shopify] non-JSON response", { status: res.status, text: text.slice(0, 500) });
  }

  if (!res.ok || !json.order) {
    console.error("[shopify] order creation FAILED", {
      status: res.status,
      domain,
      errors: json.errors,
      raw: text.slice(0, 800),
      razorpay_payment_id: payment.mihpayid,
    });
    throw new Error(`Shopify Admin error ${res.status}: ${JSON.stringify(json.errors ?? text.slice(0, 300))}`);
  }

  console.log("[shopify] order created SUCCESS", {
    order_id: json.order.id,
    order_name: json.order.name,
    order_number: json.order.order_number,
    customer_id: json.order.customer?.id,
    inventory: "decrement_obeying_policy applied",
    razorpay_payment_id: payment.mihpayid,
  });

  return json.order as { id: number; order_number: number; name: string };
}
