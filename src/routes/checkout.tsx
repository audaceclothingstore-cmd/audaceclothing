import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (p: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
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
  const clearCart = useCartStore((s) => s.clearCart);
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

  useEffect(() => {
    if (items.length === 0) navigate({ to: "/" });
  }, [items.length, navigate]);

  useEffect(() => {
    void loadRazorpay();
  }, []);

  const total = items.reduce(
    (s, i) => s + parseFloat(i.price.amount) * i.quantity,
    0
  );
  const currencyCode = items[0]?.price.currencyCode || "INR";

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
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
            const result = await v.json();
            if (!v.ok || !result.success) {
              throw new Error(result.error || "Verification failed");
            }
            clearCart();
            navigate({
              to: "/order/success",
              search: { order: result.order_name, txnid: result.order_id },
            });
          } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Payment verification failed");
            navigate({
              to: "/order/failure",
              search: { reason: "verification_failed", txnid: response.razorpay_order_id },
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

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-5xl uppercase tracking-tight mb-2">
          Checkout
        </h1>
        <p className="font-mono text-xs uppercase text-muted-foreground mb-8">
          Prepaid · Secure payment via Razorpay
        </p>

        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" value={form.firstName} onChange={update("firstName")} required />
              <Field label="Last name" value={form.lastName} onChange={update("lastName")} required />
            </div>
            <Field label="Email" type="email" value={form.email} onChange={update("email")} required />
            <Field label="Phone" type="tel" value={form.phone} onChange={update("phone")} required pattern="[0-9+\-\s]{7,15}" />
            <Field label="Address line 1" value={form.address1} onChange={update("address1")} required />
            <Field label="Address line 2 (optional)" value={form.address2} onChange={update("address2")} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={update("city")} required />
              <Field label="State" value={form.province} onChange={update("province")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pincode" value={form.zip} onChange={update("zip")} required pattern="[0-9]{4,10}" />
              <Field label="Country" value={form.country} onChange={update("country")} required />
            </div>

            <Button
              type="submit"
              disabled={submitting || items.length === 0}
              className="w-full h-14 rounded-none bg-blood text-foreground hover:bg-blood/90 font-display text-xl uppercase tracking-wide mt-4"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay ₹${total.toFixed(0)}`}
            </Button>
            <p className="font-mono text-[10px] uppercase text-muted-foreground text-center">
              UPI · GPay · PhonePe · Cards · NetBanking · Wallets
            </p>
          </form>

          <aside className="border border-border p-4 h-fit bg-card">
            <h2 className="font-display text-xl uppercase mb-4">Order</h2>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.variantId} className="flex justify-between font-mono text-xs">
                  <span className="truncate pr-2">
                    {i.product.node.title} · {i.selectedOptions.map((o) => o.value).join("/")} × {i.quantity}
                  </span>
                  <span>₹{(parseFloat(i.price.amount) * i.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-3 flex justify-between items-baseline">
              <span className="font-mono text-xs uppercase">Total</span>
              <span className="font-display text-2xl">₹{total.toFixed(0)}</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
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
        className="rounded-none mt-1 bg-background border-border focus-visible:ring-blood"
      />
    </div>
  );
}
