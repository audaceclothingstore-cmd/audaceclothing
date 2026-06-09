import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useCartStore } from "@/stores/cartStore";
import { trackPixel } from "@/lib/metaPixel";
import { CheckCircle2, Package, Truck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/order/success")({
  head: () => ({
    meta: [
      { title: "Thank you — Order Confirmed — AUDACE" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" ? s.order : "",
    txnid: typeof s.txnid === "string" ? s.txnid : "",
  }),
  component: SuccessPage,
});

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function SuccessPage() {
  const { order, txnid } = Route.useSearch();
  const clearCart = useCartStore((s) => s.clearCart);
  const items = useCartStore((s) => s.items);

  // Snapshot cart BEFORE clearing so Purchase keeps real values even across
  // StrictMode re-runs, refreshes or hydration.
  const snapshotRef = useRef<typeof items | null>(null);
  if (snapshotRef.current === null && items.length > 0) {
    snapshotRef.current = items;
  }
  const snap = snapshotRef.current ?? [];
  const total = snap.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = snap[0]?.price.currencyCode || "INR";
  const numItems = snap.reduce((s, i) => s + i.quantity, 0);
  const trackedRef = useRef(false);

  // Stable dedupe id — Shopify order name wins, then txnid.
  const dedupeId = order || txnid || "";

  useEffect(() => {
    if (trackedRef.current) return;
    // Don't fire Purchase if we have nothing real to attribute (deep-link refresh
    // after cart-clear in a new tab). Meta would otherwise see a 0-value event.
    if (snap.length === 0) return;
    trackedRef.current = true;

    trackPixel(
      "Purchase",
      {
        content_ids: snap.map((i) => i.variantId),
        content_type: "product",
        value: total,
        currency,
        num_items: numItems,
        order_id: dedupeId || undefined,
      },
      { eventID: dedupeId || `purchase-${Date.now().toString(36)}` }
    );

    // GTM / GA4 dataLayer push (no-op if dataLayer absent).
    if (typeof window !== "undefined") {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: "purchase",
        transaction_id: dedupeId || undefined,
        value: total,
        currency,
        items: snap.map((i) => ({
          item_id: i.variantId,
          item_name: i.product.node.title,
          quantity: i.quantity,
          price: parseFloat(i.price.amount),
        })),
      });
    }

    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.length]);

  const hasContext = snap.length > 0 || !!order;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-blood/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-blood" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-tight">
            Thank you for your order
          </h1>
          <p className="font-mono text-xs uppercase text-muted-foreground mt-2">
            Your payment was successful
          </p>
        </div>

        {hasContext ? (
          <>
            {order && (
              <div className="mt-6 border border-border bg-background py-4 text-center">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">
                  Order number
                </p>
                <p className="font-display text-2xl text-blood mt-1 select-all">
                  {order}
                </p>
              </div>
            )}

            {snap.length > 0 && (
              <div className="mt-6 space-y-2">
                {snap.map((i) => (
                  <div
                    key={i.variantId}
                    className="flex justify-between gap-3 font-mono text-xs"
                  >
                    <span className="truncate">
                      {i.product.node.title} ·{" "}
                      {i.selectedOptions.map((o) => o.value).join("/")} × {i.quantity}
                    </span>
                    <span>₹{(parseFloat(i.price.amount) * i.quantity).toFixed(0)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between items-baseline">
                  <span className="font-mono text-xs uppercase">Total paid</span>
                  <span className="font-display text-xl">₹{total.toFixed(0)}</span>
                </div>
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <Step icon={<ShieldCheck className="w-4 h-4" />} label="Confirmed" active />
              <Step icon={<Package className="w-4 h-4" />} label="Packed · 24h" />
              <Step icon={<Truck className="w-4 h-4" />} label="Shipped · 48–72h" />
            </div>

            <p className="font-mono text-[11px] text-muted-foreground mt-5 text-center">
              A confirmation has been sent to your email.
            </p>
          </>
        ) : (
          <p className="font-mono text-xs text-muted-foreground mt-6 text-center">
            Your order is confirmed. Check your email for the receipt and tracking
            details.
          </p>
        )}

        <Button
          asChild
          className="w-full h-14 rounded-none bg-blood text-foreground hover:bg-blood/90 font-display text-xl uppercase tracking-wide mt-6"
        >
          <Link to="/">Continue shopping</Link>
        </Button>
        <div className="text-center mt-3">
          <Link
            to="/"
            className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            View all drops
          </Link>
        </div>

        {txnid && (
          <p className="font-mono text-[10px] uppercase text-muted-foreground mt-6 text-center">
            Txn: {txnid}
          </p>
        )}
      </div>
    </div>
  );
}

function Step({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`border border-border py-2 px-1 flex flex-col items-center gap-1 ${
        active ? "bg-blood/10 border-blood/40 text-foreground" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-wide">{label}</span>
    </div>
  );
}
