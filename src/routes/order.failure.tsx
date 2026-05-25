import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/order/failure")({
  head: () => ({
    meta: [
      { title: "Payment Failed — AUDACE" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    reason: typeof s.reason === "string" ? s.reason : "",
    txnid: typeof s.txnid === "string" ? s.txnid : "",
  }),
  component: FailurePage,
});

function FailurePage() {
  const { reason, txnid } = Route.useSearch();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center border border-border p-8 bg-card">
        <XCircle className="w-14 h-14 text-blood mx-auto mb-4" />
        <h1 className="font-display text-4xl uppercase tracking-tight">Payment failed</h1>
        <p className="font-mono text-xs uppercase text-muted-foreground mt-2">
          Your card was not charged
        </p>
        {reason && (
          <p className="font-mono text-[11px] uppercase text-muted-foreground mt-4">
            Reason: {reason}
          </p>
        )}
        {txnid && (
          <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">
            Txn: {txnid}
          </p>
        )}
        <div className="mt-6 flex gap-2 justify-center">
          <Link
            to="/checkout"
            className="bg-blood px-5 py-2 font-display text-lg uppercase text-foreground hover:bg-blood/90"
          >
            Try again
          </Link>
          <Link
            to="/"
            className="border border-border px-5 py-2 font-display text-lg uppercase hover:border-blood"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
