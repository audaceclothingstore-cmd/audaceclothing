# Conversion Optimization Plan — Meta → Visitor → Buyer

Mobile-first. Every change below is designed for one-thumb scrolling and the 3-second judgement window a Meta ad visitor gives you.

## Guiding psychology
- **Match the ad**: visitor must see the same product, price, and promise within 1 screen of landing — kills bounce.
- **Reduce friction, not info**: fewer taps to "Add to cart", but more proof around the button.
- **Scarcity that's believable**: real stock counter beats fake countdowns (which Meta now penalises and Gen Z sees through).
- **Loss aversion > discount**: "Don't be #131 watching from outside" outperforms "10% off".
- **Trust at the moment of fear**: payment, sizing, returns answered *next to* the buy button, not in a footer.

---

## HOME PAGE (`src/routes/index.tsx`)

### Add
1. **Ad-match hero variant** — when visitor lands from a Meta ad with `?utm_source=meta` (or a `?p=<handle>` param), swap the hero image + headline to that exact product. Removes the "is this the thing I clicked?" doubt.
2. **Sticky mobile CTA bar** — fixed bottom bar on home: "Drop 02 · ₹[price] · Claim →" appears after hero scrolls out. Same pattern that's already on PDP — proven highest-lift mobile CRO change.
3. **Real stock counter** — replace the static "130 / 200" with a live count driven by a constant in `drops.ts` we update manually per restock. Believable scarcity > fake timer.
4. **UGC / Instagram strip** — 1 row of 4–6 square real customer photos above the manifesto. (Empty placeholders until you have content — no fake images.) Social proof in the wild is the single biggest trust lever for apparel on Meta traffic.
5. **FAQ accordion above footer** — 5 questions max: Sizing, Fabric/quality, Shipping time, Exchange, COD. Kills the #1 reason people leave to "think about it".
6. **Trust row under hero CTA** — small icons: COD available · 48hr ship · 7-day exchange · Secure UPI. Already partly there, just promote it above the fold on mobile.

### Change
7. **Hero CTA copy on mobile** — "Claim your number" is poetic but vague. A/B with **"See Drop 02 →"** (curiosity) or **"Shop ₹[price] →"** (price anchor). Vague CTAs lose mobile clicks.
8. **Hero image priority + size** — explicit `width`/`height` on the hero `<img>` to kill CLS (currently none → Lighthouse penalty + janky LP = lower Quality Score on Meta = higher CPM).
9. **Product grid first** — on mobile, push the product grid *above* the manifesto. Mobile users scroll less; the buy options must appear in screen 2, not screen 4.
10. **Single, stronger testimonial format** — current quote is good. Add the customer's photo placeholder + product worn. Faces convert.

### Remove
11. **Second ticker** ("4.9/5 · 200+ verified buyers") — duplicates the stats grid right above it and adds scroll-length. One ticker (top) is enough.
12. **"Why us" secondary CTA in hero** — two CTAs split attention on mobile. Keep only the primary "Claim/Shop" button; move "Why us" to a text link below.
13. **Sizing table on home** — move sizing to PDP only (it already exists there). Sizing on home is noise for a visitor who hasn't picked a product.
14. **Footer "Care" + decorative copy** — collapse footer to: logo, IG link, email, policies. Less is more on mobile.

---

## PRODUCT PAGE (`src/routes/product.$handle.tsx`)

### Add
1. **Above-the-fold proof block** — directly under price, a single line: "★ 4.9 · Worn by 130+ in India". Backed by real numbers only.
2. **Variant-level stock signals** — "Only 4 left in M" next to size buttons (driven by `availableForSale` + manual low-stock flag). Real scarcity per size = urgency at the decision moment.
3. **"What's in the box" / "Pairs with"** strip — 1 small row showing it being styled with denim/cargo. Increases AOV and reduces "I'm not sure how to wear it" hesitation.
4. **Sticky mobile bar: add size chip** — currently bar shows price + Add to cart. Add the selected size chip and a tiny inline size picker so users never scroll back up. Cuts a tap → measurable lift.
5. **Express checkout button** — second button under "Add to cart": **"Buy now"** that adds + goes straight to checkout. Mobile impulse buys complete 20–30% better with one-tap path.
6. **FAQ accordion (3 items)** under product: "Will it shrink?", "Is COD available?", "How does it fit if I'm between sizes?". Kills the last objections.
7. **Recently-viewed indicator** in nav cart count — already present, good. Add a small "X people viewing this drop right now" line only if you can make it real (otherwise skip — fake creates distrust).

### Change
8. **"No returns" framing** — currently shown 3 times in hard red language (`No returns`, `Prepaid only`, `PackageX` icon). This *kills* trust for first-time buyers from Meta. Reframe as **"7-day size exchange · Defects replaced free"** and demote "no returns" to the policy section. Same policy, much less scary.
9. **Image gallery dots** — add visible dots/index "1/5" under the swipe gallery so users know there are more photos. On mobile most people don't realise they can swipe.
10. **Size button feedback** — make the unavailable sizes more obvious (current 40% opacity is too subtle) and add "Sold out" label under them — turns scarcity visible.
11. **Description above details** — Shopify description currently sits between price and size picker. Move below the Add-to-cart button on mobile so the CTA is closer to the fold.
12. **CTA button copy** — "Add to cart · ₹X" is fine, but mobile A/B with **"Add ₹X → Cart"** (cleaner) and ensure the price never wraps.

### Remove
13. **Two redundant policy blocks** — the "Shipping & policy" and "Details" duplicate "48–72 hr · prepaid · no returns" already shown in the icon row. Collapse into one accordion.
14. **"Made in India / QC verified / Secure checkout" row** — keep only "Secure checkout" + payment logos (Visa/MC/UPI/RuPay). Generic badges create banner blindness; real payment logos build trust.

---

## CROSS-CUTTING (both pages)

- **Page speed**: hero `<img>` needs explicit dimensions + `loading="eager"` (✔) + AVIF/WebP via vite-imagetools. Mobile LCP < 2.5s ≈ +15% conversion on Meta cold traffic.
- **Meta Pixel completeness**: `ViewContent` is wired on PDP (✔). Add `InitiateCheckout` on Buy Now click, `AddToCart` on Add (verify it fires). Better signals = lower CPA from Meta optimisation.
- **Single offer per page**: kill any link that leaves the funnel mid-decision (e.g. nav links to Manifesto/Sizing from PDP). Replace nav with just Logo + Cart on PDP for mobile.
- **Copy tone audit**: current copy oscillates between poetic ("Wear the nerve") and salesy ("130 of 200 gone"). Pick one per section — poetic for brand sections, direct for CTAs.
- **COD**: mentioned but unclear if actually available. If yes, badge it prominently on PDP near price ("COD ₹49 fee" or "Free COD") — single biggest India-specific lift.

---

## Suggested build order (highest ROI first)
1. PDP: reframe returns + add Buy Now + sticky bar size chip + payment logos
2. Home: sticky mobile CTA + push product grid above manifesto + ad-match hero
3. Both: FAQ accordions
4. Both: CLS/LCP fixes (image dims, AVIF)
5. UGC strip (once you have real photos)

## Open questions before build
- Is **COD actually live** on checkout? (Drives PDP messaging.)
- Do you want **"Buy now"** to bypass cart entirely (direct to Shopify checkout) or pre-fill cart + redirect?
- Real **stock numbers** per drop — should I read from Shopify inventory or keep manual constants in `drops.ts`?
- Do you have any **real customer photos** for the UGC strip yet, or should I scaffold empty slots?
