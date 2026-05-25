import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/order/success")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — AUDACE" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    order: typeof s.order === "string" ? s.order : "",
    txnid: typeof s.txnid === "string" ? s.txnid : "",
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { order, txnid } = Route.useSearch();
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center border border-border p-8 bg-card">
        <CheckCircle2 className="w-14 h-14 text-blood mx-auto mb-4" />
        <h1 className="font-display text-4xl uppercase tracking-tight">Locked in</h1>
        <p className="font-mono text-xs uppercase text-muted-foreground mt-2">
          Payment received · Order placed
        </p>
        {order && (
          <p className="font-mono text-sm mt-4">
            Order <span className="text-blood">{order}</span>
          </p>
        )}
        {txnid && (
          <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">
            Txn: {txnid}
          </p>
        )}
        <p className="font-mono text-[11px] text-muted-foreground mt-4">
          A confirmation has been sent to your email. Ships in 48–72 hrs.
        </p>
        <Link
          to="/"
          className="inline-block mt-6 bg-blood px-6 py-3 font-display text-lg uppercase text-foreground hover:bg-blood/90"
        >
          Back to the drop
        </Link>
      </div>
    </div>
  );
}
