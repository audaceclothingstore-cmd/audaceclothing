import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PRODUCTS_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { Navbar } from "@/components/Navbar";
import { Ticker } from "@/components/Ticker";
import { ProductCard } from "@/components/ProductCard";
import { getDropForHandle } from "@/lib/drops";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import logo from "@/assets/audace-logo.png";
import heroAsset from "@/assets/hero-built-different.png.asset.json";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCTS_QUERY, { first: 20, query: null });
      return (res?.data?.products?.edges ?? []) as ShopifyProduct[];
    },
  });
  const products = data ?? [];
  const drop2 = products.filter((p) => getDropForHandle(p.node.handle) === 2);

  // Sticky mobile CTA appears after hero scrolls out
  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <Ticker items={["Drop 02 live — 200 pieces only", "Already 70% claimed", "Free shipping over ₹1499", "48hr dispatch · Pan-India", "Once sold, gone forever"]} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-ink">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-24 grid md:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="space-y-6 md:space-y-7 order-2 md:order-1">
            <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-1.5 w-1.5 bg-blood animate-pulse rounded-full" />
              Drop 02 live · Only 200 made
            </div>
            <h1 className="font-display text-5xl sm:text-7xl md:text-8xl leading-[0.85] uppercase tracking-tight">
              Only <span className="text-blood">200</span><br />will ever<br />own this.
            </h1>
            <div className="h-px w-24 bg-border" />
            <p className="font-body text-base md:text-lg text-muted-foreground max-w-md">
              240 GSM heavyweight cotton. Hand-numbered 1 to 200. No restocks.
              <span className="text-foreground font-medium"> Over 130 already claimed.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#drop" className="group inline-flex items-center justify-center gap-3 bg-blood text-foreground px-6 py-4 font-display text-xl uppercase tracking-wide hover:bg-blood/90 shadow-lg shadow-blood/30">
                Shop Drop 02
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>★ 4.9 / 5</span><span>· 48hr dispatch</span><span>· 7-day exchange</span>
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-3 bg-blood/20 blur-3xl pointer-events-none" />
            <div className="relative aspect-[2/3] bg-ink border border-border overflow-hidden">
              <img
                src={heroAsset.url}
                alt="Audace Drop 02"
                width={800}
                height={1200}
                className="w-full h-full object-cover"
                fetchPriority="high"
              />
              <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-md border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-blood rounded-full animate-pulse" />Live now</span>
                <span className="text-blood">130 / 200 claimed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID — DROP 02 (above the fold on mobile after hero) */}
      <section id="drop" className="mx-auto max-w-7xl px-5 md:px-8 py-12 md:py-20">
        <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood mb-2">// Live drop · Almost gone</p>
            <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tight">Drop 02</h2>
          </div>
          <p className="hidden md:block font-mono text-[10px] uppercase text-muted-foreground">Selling fast · No restocks</p>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] bg-card border border-border animate-pulse" />)}
          </div>
        ) : drop2.length === 0 ? (
          <div className="border border-dashed border-border p-16 text-center">
            <p className="font-display text-3xl uppercase">No products found</p>
            <p className="font-mono text-xs uppercase text-muted-foreground mt-2">Drop incoming.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {drop2.map((p) => <ProductCard key={p.node.id} product={p} />)}
          </div>
        )}
      </section>

      {/* USP STRIP */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 pb-4 md:pb-8 grid md:grid-cols-3 gap-px bg-border">
        {[
          { k: "Built to outlast", v: "240 GSM heavyweight cotton · holds shape after 50+ washes" },
          { k: "At your door in 48 hrs", v: "Dispatched within 24 hrs · Free shipping over ₹1499" },
          { k: "Yours, only 200 made", v: "Hand-numbered 1–200 · Easy 7-day size exchange" },
        ].map((c) => (
          <div key={c.k} className="bg-background p-6 md:p-8">
            <p className="font-display text-2xl uppercase">{c.k}</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mt-2">{c.v}</p>
          </div>
        ))}
      </section>

      {/* SOCIAL PROOF */}
      <section id="manifesto" className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-16 md:py-24 text-center space-y-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood">// Loved by the loud ones</p>
          <h2 className="font-display text-4xl md:text-7xl leading-[0.9] uppercase">
            "I've never had a tee<br />get <span className="text-blood">this many</span> compliments."
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">— Aarav M. · Verified buyer · Drop 01</p>
          <div className="grid grid-cols-3 gap-px bg-border max-w-3xl mx-auto mt-8">
            {[
              { n: "200+", l: "5-star reviews" },
              { n: "100%", l: "Sold out · Drop 01" },
              { n: "48hr", l: "Avg. dispatch" },
            ].map((s) => (
              <div key={s.l} className="bg-card p-4 md:p-6">
                <p className="font-display text-3xl md:text-4xl text-blood">{s.n}</p>
                <p className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — kills the "let me think about it" objection */}
      <section className="mx-auto max-w-3xl px-5 md:px-8 py-16 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood mb-2">// Before you ask</p>
        <h2 className="font-display text-4xl md:text-5xl uppercase mb-8">Quick answers</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="size">
            <AccordionTrigger className="font-display text-xl uppercase tracking-tight text-left">How do I pick a size?</AccordionTrigger>
            <AccordionContent className="font-body text-muted-foreground">
              Every piece is intentionally oversized. If you're between sizes, go down — the boxy drop-shoulder cut still falls relaxed. Detailed chest/length chart lives on each product page.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="ship">
            <AccordionTrigger className="font-display text-xl uppercase tracking-tight text-left">When will it arrive?</AccordionTrigger>
            <AccordionContent className="font-body text-muted-foreground">
              Orders dispatch within 24 hours. Delivery is 48–72 hours across India. Free shipping on orders over ₹1499.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="exchange">
            <AccordionTrigger className="font-display text-xl uppercase tracking-tight text-left">What if it doesn't fit?</AccordionTrigger>
            <AccordionContent className="font-body text-muted-foreground">
              Easy 7-day size exchange. Manufacturing defects are replaced free of charge — just message us within 24 hours of delivery.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="quality">
            <AccordionTrigger className="font-display text-xl uppercase tracking-tight text-left">Why 240 GSM?</AccordionTrigger>
            <AccordionContent className="font-body text-muted-foreground">
              Most fast-fashion tees are 140–180 GSM and thin out after a few washes. 240 GSM heavyweight cotton holds its structure, drape, and colour after 50+ washes. You feel the difference the moment you wear it.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="bg-blood">
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-14 md:py-20 text-center space-y-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/80">// Last call</p>
          <h2 className="font-display text-3xl md:text-6xl uppercase leading-[0.95]">
            130 of 200 already gone.<br />Will you wear #131 — or watch?
          </h2>
          <a href="#drop" className="inline-flex items-center gap-3 bg-foreground text-blood px-7 py-4 md:px-8 md:py-5 font-display text-xl md:text-2xl uppercase tracking-wide hover:bg-foreground/90">
            Claim your number →
          </a>
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/80">UPI · Cards · 7-day exchange</p>
        </div>
      </section>

      {/* FOOTER — simplified */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Audace" className="h-9 w-auto" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Wear the nerve · Est. 2026</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex gap-5">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-blood">Instagram</a>
            <a href="mailto:hello@audace.in" className="hover:text-blood">Email</a>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          © 2026 Audace. All nerves reserved.
        </div>
      </footer>

      {/* STICKY MOBILE CTA BAR */}
      {showStickyCta && drop2.length > 0 && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="flex-1 min-w-0">
            <p className="font-display text-base uppercase leading-none">Drop 02 · Live now</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-1">130 / 200 claimed</p>
          </div>
          <a href="#drop" className="h-12 px-5 bg-blood font-display text-lg uppercase tracking-wide text-foreground flex items-center gap-2">
            Shop →
          </a>
        </div>
      )}
      {showStickyCta && <div className="md:hidden h-20" />}
    </div>
  );
}
