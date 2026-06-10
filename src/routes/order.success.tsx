import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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

const SNAP_KEY = "audace_purchase_snapshot";

interface SnapshotItem {
  variantId: string;
  title: string;
  quantity: number;
  price: string;
  currencyCode: string;
}

interface PurchaseSnapshot {
  items: SnapshotItem[];
  total: number;
  currency: string;
  numItems: number;
  orderId: string;
  orderName: string;
  ts: number;
}

function readSnapshot(): PurchaseSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SNAP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PurchaseSnapshot;
  } catch {
    return null;
  }
}

function SuccessPage() {
  const { order, txnid } = Route.useSearch();
  const clearCart = useCartStore((s) => s.clearCart);
  const liveItems = useCartStore((s) => s.items);

  // Read sessionStorage snapshot once on mount. Falls back to live cart if
  // present (defensive — older flows may still have items here).
  const [snapshot] = useState<PurchaseSnapshot | null>(() => {
    const snap = readSnapshot();
    if (snap) return snap;
    if (liveItems.length > 0) {
      return {
        items: liveItems.map((i) => ({
          variantId: i.variantId,
          title: i.product.node.title,
          quantity: i.quantity,
          price: i.price.amount,
          currencyCode: i.price.currencyCode,
        })),
        total: liveItems.reduce(
          (s, i) => s + parseFloat(i.price.amount) * i.quantity,
          0
        ),
        currency: liveItems[0]?.price.currencyCode || "INR",
        numItems: liveItems.reduce((s, i) => s + i.quantity, 0),
        orderId: txnid || "",
        orderName: order || "",
        ts: Date.now(),
      };
    }
    return null;
  });

  const trackedRef = useRef(false);

  // Stable dedupe id — Shopify order name wins, then snapshot orderName, then txnid.
  const dedupeId = order || snapshot?.orderName || txnid || snapshot?.orderId || "";

  useEffect(() => {
    if (trackedRef.current) return;
    if (!snapshot || snapshot.items.length === 0) {
      // Nothing real to attribute (deep-link refresh in a new tab). Don't fire 0-value.
      return;
    }
    trackedRef.current = true;

    trackPixel(
      "Purchase",
      {
        content_ids: snapshot.items.map((i) => i.variantId),
        content_type: "product",
        contents: snapshot.items.map((i) => ({
          id: i.variantId,
          quantity: i.quantity,
          item_price: parseFloat(i.price),
        })),
        value: snapshot.total,
        currency: snapshot.currency,
        num_items: snapshot.numItems,
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
        value: snapshot.total,
        currency: snapshot.currency,
        items: snapshot.items.map((i) => ({
          item_id: i.variantId,
          item_name: i.title,
          quantity: i.quantity,
          price: parseFloat(i.price),
        })),
      });
    }

    // Tracking is done — safe to clear cart & snapshot now.
    try {
      sessionStorage.removeItem(SNAP_KEY);
    } catch {
      /* ignore */
    }
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasContext = (snapshot?.items.length ?? 0) > 0 || !!order;

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

            {snapshot && snapshot.items.length > 0 && (
              <div className="mt-6 space-y-2">
                {snapshot.items.map((i) => (
                  <div
                    key={i.variantId}
                    className="flex justify-between gap-3 font-mono text-xs"
                  >
                    <span className="truncate">
                      {i.title} × {i.quantity}
                    </span>
                    <span>₹{(parseFloat(i.price) * i.quantity).toFixed(0)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between items-baseline">
                  <span className="font-mono text-xs uppercase">Total paid</span>
                  <span className="font-display text-xl">
                    ₹{snapshot.total.toFixed(0)}
                  </span>
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
