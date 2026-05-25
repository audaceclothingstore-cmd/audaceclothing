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
      { name: "description", content: "Secure checkout powered by PayU." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
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
      const res = await fetch("/api/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      // Replace document with the auto-submit form -> goes to PayU
      document.open();
      document.write(html);
      document.close();
    } catch (err) {
      console.error(err);
      toast.error("Could not start payment. Please try again.");
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
          Prepaid · Secure payment via PayU
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
