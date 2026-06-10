
## Diagnosis

### 1. Meta Purchase event is inactive — REAL BUG FOUND

In `src/routes/checkout.tsx` (line ~198), after Razorpay returns success the code does this:

```
clearCart();
navigate({ to: "/order/success", ... });
```

So by the time `/order/success` mounts, `useCartStore.items` is already empty. The success page guards Purchase firing with:

```
if (snap.length === 0) return;
```

→ Purchase event **never fires** for successful payments. That's exactly why Meta Events Manager shows it as "Inactive" — Meta has never received it.

Same issue for the PayU flow: cart is cleared on `/api/payu/callback` before redirect.

### 2. Shopify orders not being created

Looking at `src/routes/api/razorpay/verify.ts`: when `createShopifyOrder` throws, the endpoint **swallows the error** and still returns `success: true` with a `warning` toast. That's why the user sees the thank-you page but no order in Shopify admin.

Without server logs for the specific txn (`pay_SzeKsVOoSYPKKF` is older than 1h, so logs are gone), the most likely causes from the code in `src/lib/shopify-admin.ts` are:

- **`SHOPIFY_ADMIN_ACCESS_TOKEN` is missing the `write_orders` scope** (silent 403/422 from Shopify Admin API). This is the #1 cause when storefront reads work but Admin order creates fail.
- `SHOPIFY_STORE_DOMAIN` env points to a domain different from the storefront's `myshopify.com`.
- `country: "India"` literal passed without a `country_code` — newer Admin API versions sometimes require `country_code: "IN"`.
- `send_receipt: true` + `inventory_behaviour: "decrement_obeying_policy"` require extra scopes.

We need both **a code fix** to stop hiding failures, and **a tiny ping endpoint** so we can confirm the token + scopes are correct in seconds.

---

## Plan

### A. Fix Meta Purchase event (precise)

Goal: Purchase fires exactly once on the success page, with real value/items, on every successful order.

1. In `src/routes/checkout.tsx` Razorpay `handler`:
   - **Remove** the `clearCart()` call before navigation.
   - Before navigating, write a one-shot purchase snapshot to `sessionStorage` under key `audace_purchase_snapshot`:
     ```
     { items, total, currency, numItems, orderId, orderName, ts }
     ```
   - Then navigate to `/order/success`.

2. In `src/routes/order.success.tsx`:
   - On mount, read snapshot from `sessionStorage` first, fall back to live cart, fall back to nothing.
   - Use snapshot for Purchase params and the visible line items.
   - After firing Purchase (and only after), call `clearCart()` and `sessionStorage.removeItem('audace_purchase_snapshot')`.
   - Keep the existing `trackedRef` + `dedupeId` (uses Shopify order name → txnid) so it fires exactly once with a stable `eventID`.

3. PayU path (`src/routes/api/payu/callback.ts` redirects to `/order/success`). Since the server can't write `sessionStorage`, add a tiny client bridge:
   - On `/checkout`, before submitting to `/api/payu/initiate`, write the same `audace_purchase_snapshot` to `sessionStorage` keyed by `pendingTxnid`. (Already non-invasive if PayU is still used; if PayU isn't used right now this is a no-op.)
   - Success page reads it on landing.

4. Keep the `dataLayer.push({event:'purchase',...})` already in place.

5. Verification:
   - Open Chrome DevTools → Network → filter `facebook.com/tr` after a test payment. Confirm one `Purchase` request with `cd[value]`, `cd[currency]=INR`, `cd[content_ids]`, and the `eventID` matching the order name.
   - Meta Pixel Helper should show 1 × Purchase, 0 × duplicates.
   - In Meta Events Manager → Test Events, the Purchase will start showing within minutes; status flips from "Inactive" to "Active" automatically once Meta sees recent events.

### B. Stop hiding the Shopify failure + add a fast diagnosis path

1. In `src/routes/api/razorpay/verify.ts`:
   - Keep the "payment confirmed" success response (so a debited customer never sees a failure screen).
   - **But** add a structured error field in the JSON: `shopify_order_created: false, shopify_error: "<message>"` and log the full Shopify response body (status, errors, raw text) — already logged but make sure it includes the `errors` JSON keys, not just the message string.
   - Same hardening in `src/routes/api/payu/callback.ts` — log the Shopify failure clearly.

2. In `src/lib/shopify-admin.ts`:
   - Add `country_code: "IN"` alongside `country` in billing/shipping addresses (defensive; harmless if Shopify already accepts the name).
   - Drop `send_receipt: true` and `send_fulfillment_receipt` from the initial create (they require notification scopes; Shopify will still email if those are configured at store level). This removes a likely 403 vector.
   - Log the resolved `domain` + `apiVersion` + first 200 chars of the response body on failure (already partly there).

3. Add a new diagnostic server route `src/routes/api/debug/shopify-ping.ts`:
   - GET only, returns JSON `{ ok, domain, scopes, shop }`.
   - Calls `GET /admin/api/2025-07/shop.json` and `GET /admin/oauth/access_scopes.json` with `SHOPIFY_ADMIN_ACCESS_TOKEN`.
   - Lets us instantly confirm: (a) token is valid, (b) `write_orders` is in the scope list, (c) the domain we're hitting is correct.
   - Not exposed in any UI; called once from chat with `stack_modern--invoke-server-function`.

4. After deploying:
   - Hit `/api/debug/shopify-ping` from the agent. If `write_orders` is missing → ask the user to re-issue the Admin API access token in Shopify with `write_orders`, `write_customers`, `read_products` scopes and update the `SHOPIFY_ADMIN_ACCESS_TOKEN` secret.
   - If scopes are fine, place one more test order and read the fresh server logs (in-hour) for the exact `errors` payload Shopify returned, and adapt the order payload (most often a `country_code` or `province_code` requirement).

### C. Out of scope (call out, don't do)
- Meta Conversions API (server-side dedup with `eventID`) — separate change, can be added next.
- Abandoned-checkout email recovery.
- Retry queue for failed Shopify creates (would need DB; can add once Cloud is enabled).

---

## Files touched

- `src/routes/checkout.tsx` — remove pre-nav `clearCart`, write `sessionStorage` snapshot.
- `src/routes/order.success.tsx` — read snapshot, fire Purchase, then clear cart + snapshot.
- `src/routes/api/razorpay/verify.ts` — surface Shopify error in response + better logging.
- `src/routes/api/payu/callback.ts` — same logging treatment.
- `src/lib/shopify-admin.ts` — add `country_code`, drop notification flags, harden logging.
- `src/routes/api/debug/shopify-ping.ts` — NEW, GET-only token/scope probe.

No schema changes, no payment/signing changes, no pixel-init changes.
