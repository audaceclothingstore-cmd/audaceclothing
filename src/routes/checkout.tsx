import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Truck, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { trackPixel } from "@/lib/metaPixel";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — AUDACE" },
      { name: "description", content: "Secure checkout powered by Razorpay." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => {
      open: () => void;
      on: (e: string, cb: (p: unknown) => void) => void;
    };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  // cart is cleared on /order/success after Purchase event fires
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "India",
  });
  const formRef = useRef<HTMLFormElement | null>(null);

  const total = items.reduce(
    (s, i) => s + parseFloat(i.price.amount) * i.quantity,
    0
  );
  const currencyCode = items[0]?.price.currencyCode || "INR";
  const numItems = items.reduce((s, i) => s + i.quantity, 0);

  // Soft redirect if cart empty: show recovery card briefly then go home.
  const [emptyRedirect, setEmptyRedirect] = useState(false);
  useEffect(() => {
    if (items.length === 0) {
      setEmptyRedirect(true);
      const t = setTimeout(() => navigate({ to: "/" }), 2500);
      return () => clearTimeout(t);
    }
  }, [items.length, navigate]);

  useEffect(() => {
    void loadRazorpay();
  }, []);

  // Fire InitiateCheckout exactly once per checkout session.
  const icFiredRef = useRef(false);
  useEffect(() => {
    if (icFiredRef.current) return;
    if (items.length === 0) return;
    icFiredRef.current = true;
    trackPixel("InitiateCheckout", {
      content_ids: items.map((i) => i.variantId),
      content_type: "product",
      value: total,
      currency: currencyCode,
      num_items: numItems,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const update =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Native validation + scroll to first invalid.
    const formEl = formRef.current;
    if (formEl && !formEl.checkValidity()) {
      const invalid = formEl.querySelector<HTMLInputElement>(":invalid");
      invalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      invalid?.focus();
      formEl.reportValidity();
      return;
    }

    setSubmitting(true);

    const payload = {
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price.amount,
        title: i.product.node.title,
      })),
      customer: form,
      currency: currencyCode,
    };

    try {
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load payment gateway");
      }

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const order = (await res.json()) as {
        order_id: string;
        amount: number;
        currency: string;
        key_id: string;
      };

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: "AUDACE",
        description: "Order payment",
        prefill: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          contact: form.phone,
        },
        notes: { address: form.address1 },
        theme: { color: "#dc2626" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast.message("Payment cancelled");
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const v = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(response),
            });
            const result = await v.json().catch(() => ({}));
            if (v.ok && (result.success || result.verified)) {
              // Snapshot purchase BEFORE clearing cart so success page can
              // fire Meta Purchase with real value/items even after refresh.
              try {
                const snapshot = {
                  items: items.map((i) => ({
                    variantId: i.variantId,
                    title: i.product.node.title,
                    quantity: i.quantity,
                    price: i.price.amount,
                    currencyCode: i.price.currencyCode,
                  })),
                  total,
                  currency: currencyCode,
                  numItems,
                  orderId: result.order_id || response.razorpay_order_id,
                  orderName: result.order_name || "",
                  ts: Date.now(),
                };
                sessionStorage.setItem(
                  "audace_purchase_snapshot",
                  JSON.stringify(snapshot)
                );
              } catch (e) {
                console.warn("[checkout] could not write purchase snapshot", e);
              }
              if (result.warning) toast.message(result.warning);
              navigate({
                to: "/order/success",
                search: {
                  order: result.order_name || "",
                  txnid: result.order_id || response.razorpay_order_id,
                },
              });
              return;
            }
            throw new Error(result.error || "Verification failed");
          } catch (err) {
            console.error("[checkout] verify error", err);
            toast.error(err instanceof Error ? err.message : "Payment verification failed");
            navigate({
              to: "/order/failure",
              search: {
                reason: "verification_failed",
                txnid: response.razorpay_order_id,
              },
            });
          }
        },
      });

      rzp.on("payment.failed", (resp: unknown) => {
        console.error("Razorpay payment.failed", resp);
        const r = resp as { error?: { description?: string } };
        toast.error(r?.error?.description || "Payment failed");
        setSubmitting(false);
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not start payment");
      setSubmitting(false);
    }
  };

  if (emptyRedirect) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-border bg-card p-8 text-center">
          <h1 className="font-display text-3xl uppercase tracking-tight">
            Your cart is empty
          </h1>
          <p className="font-mono text-xs uppercase text-muted-foreground mt-2">
            Taking you back to the drop…
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

  const payCta = submitting ? (
    <>
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      Opening secure payment…
    </>
  ) : (
    <>Pay ₹{total.toFixed(0)} securely</>
  );

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 pb-32 md:pb-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight mb-3">
          Checkout
        </h1>

        {/* Trust strip */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase text-muted-foreground mb-6">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure payment
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> 7-day exchange
          </span>
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" /> Ships 48–72 hrs
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> 100% authentic
          </span>
        </div>

        {/* Mobile order summary on top, collapsible */}
        <details
          open
          className="md:hidden border border-border bg-card mb-6 group"
        >
          <summary className="cursor-pointer flex items-center justify-between px-4 py-3 list-none">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                Order ({numItems} {numItems === 1 ? "item" : "items"})
              </span>
            </div>
            <span className="font-display text-xl">₹{total.toFixed(0)}</span>
          </summary>
          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
            {items.map((i) => (
              <div
                key={i.variantId}
                className="flex justify-between font-mono text-xs"
              >
                <span className="truncate pr-2">
                  {i.product.node.title} ·{" "}
                  {i.selectedOptions.map((o) => o.value).join("/")} × {i.quantity}
                </span>
                <span>₹{(parseFloat(i.price.amount) * i.quantity).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </details>

        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <form
            ref={formRef}
            onSubmit={submit}
            noValidate={false}
            className="space-y-4"
          >
            {/* Contact */}
            <SectionLabel>Contact</SectionLabel>
            <div className="grid md:grid-cols-2 gap-3">
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                autoComplete="email"
                inputMode="email"
                disabled={submitting}
              />
              <Field
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                required
                pattern="[0-9+\-\s]{7,15}"
                autoComplete="tel"
                inputMode="numeric"
                disabled={submitting}
              />
            </div>

            {/* Shipping */}
            <SectionLabel className="pt-2">Shipping</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="First name"
                value={form.firstName}
                onChange={update("firstName")}
                required
                autoComplete="given-name"
                disabled={submitting}
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={update("lastName")}
                required
                autoComplete="family-name"
                disabled={submitting}
              />
            </div>
            <Field
              label="Address line 1"
              value={form.address1}
              onChange={update("address1")}
              required
              autoComplete="address-line1"
              disabled={submitting}
            />
            <Field
              label="Address line 2 (optional)"
              value={form.address2}
              onChange={update("address2")}
              autoComplete="address-line2"
              disabled={submitting}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="City"
                value={form.city}
                onChange={update("city")}
                required
                autoComplete="address-level2"
                disabled={submitting}
              />
              <Field
                label="State"
                value={form.province}
                onChange={update("province")}
                required
                autoComplete="address-level1"
                disabled={submitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <Field
                label="Pincode"
                value={form.zip}
                onChange={update("zip")}
                required
                pattern="[0-9]{4,10}"
                autoComplete="postal-code"
                inputMode="numeric"
                disabled={submitting}
              />
              <div>
                <Label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  Shipping to
                </Label>
                <div className="mt-1 h-10 border border-border bg-background/60 px-3 flex items-center font-mono text-xs uppercase">
                  🇮🇳 India
                </div>
              </div>
            </div>

            {/* Payment badges */}
            <div className="pt-4">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {["UPI", "GPay", "PhonePe", "Visa", "RuPay", "NetBanking"].map(
                  (p) => (
                    <span
                      key={p}
                      className="border border-border bg-background px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
                    >
                      {p}
                    </span>
                  )
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full h-14 rounded-none bg-blood text-foreground hover:bg-blood/90 font-display text-xl uppercase tracking-wide flex items-center justify-center"
              >
                {payCta}
              </Button>
              <p className="font-mono text-[10px] uppercase text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Encrypted payment · Prepaid only · No
                hidden charges
              </p>
            </div>
          </form>

          {/* Desktop side summary */}
          <aside className="hidden md:block border border-border p-4 h-fit bg-card sticky top-6">
            <h2 className="font-display text-xl uppercase mb-4">Order</h2>
            <div className="space-y-3">
              {items.map((i) => (
                <div
                  key={i.variantId}
                  className="flex justify-between font-mono text-xs"
                >
                  <span className="truncate pr-2">
                    {i.product.node.title} ·{" "}
                    {i.selectedOptions.map((o) => o.value).join("/")} × {i.quantity}
                  </span>
                  <span>
                    ₹{(parseFloat(i.price.amount) * i.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-3 flex justify-between items-baseline">
              <span className="font-mono text-xs uppercase">Total</span>
              <span className="font-display text-2xl">₹{total.toFixed(0)}</span>
            </div>
            <div className="mt-4 space-y-1 font-mono text-[10px] uppercase text-muted-foreground">
              <p>· Free shipping above ₹1499</p>
              <p>· 7-day size exchange</p>
              <p>· Ships in 48–72 hrs</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky mobile pay bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border px-4 py-3 flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] uppercase text-muted-foreground">
            Total
          </span>
          <span className="font-display text-xl leading-none">
            ₹{total.toFixed(0)}
          </span>
        </div>
        <Button
          type="button"
          onClick={() => formRef.current?.requestSubmit()}
          disabled={submitting || items.length === 0}
          className="flex-1 h-12 rounded-none bg-blood text-foreground hover:bg-blood/90 font-display text-base uppercase tracking-wide flex items-center justify-center"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" /> Pay securely
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-mono text-[10px] uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </h2>
  );
}

function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <Input
        {...rest}
        className="rounded-none mt-1 bg-background border-border focus-visible:ring-blood invalid:border-blood/60"
      />
    </div>
  );
}
