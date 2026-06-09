## Goal
Stop the bleed between "InitiateCheckout" and "Purchase" by removing friction on `/checkout`, and ship a clear thank-you screen on `/order/success` whose render is the canonical trigger for the Meta `Purchase` event.

## 1. `/checkout` — mobile-first conversion overhaul

Current page is one long form on desktop layout with no urgency, no mobile sticky CTA, and the order summary sits below the form on mobile (so users can't see what they're paying for).

Changes (all UI/UX, no payment-logic changes):

- **Trust strip under the H1**: `🔒 Secure payment · 7-day exchange · Ships in 48–72 hrs · 100% authentic`. Tiny, mono, all caps.
- **Order summary becomes a collapsible card at the TOP on mobile** (`<details>` open by default showing total, expandable for line items). On desktop keep the right rail.
- **Express path**: prominent "₹{total} — Pay securely" button rendered in two places on mobile: inline at form end + a **sticky bottom bar** that follows scroll, with the total on the left and CTA on the right. Desktop keeps the inline button.
- **Field reductions / autofill**:
  - Add `autoComplete` to every field (`email`, `tel`, `given-name`, `family-name`, `address-line1`, `address-line2`, `address-level2`, `address-level1`, `postal-code`, `country-name`).
  - Add `inputMode="numeric"` to phone + pincode and `inputMode="email"` to email — pops the right mobile keyboard.
  - Country pre-set to India and rendered as a read-only chip ("Shipping to India") instead of an input, removing one field.
  - Combine first+last into one row (already done) and email+phone into one row on desktop to shorten visual height.
- **Inline validation feedback**: required-field check turns the field border red on blur if invalid; current pattern-only validation is invisible until submit.
- **Reassurance row above the CTA**: payment-method logos (UPI / GPay / PhonePe / Visa / RuPay) + "No COD — prepaid only" already there, restyled as small badges.
- **Loading affordance**: when `submitting` is true, disable inputs and show "Opening secure payment…" beside the spinner so users don't tap twice.
- **Auto-scroll to first invalid field** if the form fails HTML5 validation.
- **Recovery copy**: if the cart is empty on hit, instead of silently redirecting, show a one-line "Your cart is empty — back to the drop" with a button (1-second delay before redirect) so accidental hits aren't disorienting.

No changes to: Razorpay flow, server endpoints, price verification, or the existing `InitiateCheckout` pixel ref-guard.

## 2. `/order/success` — thank-you card + Meta Purchase

Today the page already renders a card and fires `Purchase`, but it's labeled "Locked in" with a "Back to the drop" link — the user wants a clearer thank-you with an explicit Continue CTA. Also, the `Purchase` event needs to be the canonical post-payment trigger Meta sees.

Changes:

- **Rename + redesign card** to a clear thank-you:
  - Big check icon
  - H1: "Thank you for your order"
  - Sub: "Your payment was successful"
  - Order number block: `Order #AUDxxx` (large, copyable)
  - Summary: items × qty + total (reused from the snapshot already in state)
  - "What happens next" three-step strip: Confirmed → Packed (24h) → Shipped (48–72h) with tiny icons
  - Email reassurance line (already present)
- **Primary CTA**: large **"Continue shopping"** button (full-width on mobile) → `/`.
- **Secondary**: text link "View all drops" → `/`.
- **Purchase event hardening** (keeps Meta dedupe airtight so this page IS the conversion):
  - Keep the snapshot-before-clear pattern (already in place).
  - Use the Shopify order name (e.g. `#AUD1042`) as the eventID — falls back to `txnid` — so a refresh never double-counts.
  - Also push a `dataLayer` event `{ event: "purchase", transaction_id, value, currency, items }` for any future GA4/GTM hookup, no-op if `dataLayer` is absent.
  - Fire exactly once via the existing `trackedRef` guard.
- **Empty-state guard**: if a user lands on `/order/success` with no snapshot AND no `order` param (deep-link / refresh after cart-clear in a new tab), render a friendly "Thanks — your order is confirmed. Check your email for details." card with the Continue button, and do NOT re-fire `Purchase`.

## 3. Cross-cutting

- No changes to `metaPixel.ts` — current `trackPixel` already attaches `eventID` for Meta-side dedupe and the success page already passes a stable id.
- No new dependencies.

## Technical notes

Files touched:
- `src/routes/checkout.tsx` — UI restructure, sticky bottom bar (mobile only via Tailwind `md:hidden`), autocomplete attrs, validation polish.
- `src/routes/order.success.tsx` — restructured card, Continue CTA, dataLayer push, empty-state branch.

No server, schema, payment, or pixel-init changes.

## Out of scope (call out for the user)
- A/B testing infrastructure
- Abandoned-checkout recovery email (would need a server-side trigger)
- Server-side Meta Conversions API (browser pixel only for now)

Ready to build on approval.