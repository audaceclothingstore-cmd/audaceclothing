import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PRODUCTS_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { Navbar } from "@/components/Navbar";
import { Ticker } from "@/components/Ticker";
import { ProductCard } from "@/components/ProductCard";
import { getDropForHandle } from "@/lib/drops";
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <Ticker items={["Drop 02 live — 200 pieces only", "Already 70% claimed", "Free shipping over ₹1499", "48hr dispatch · Pan-India", "Once sold, gone forever", "Wear the nerve"]} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-ink">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8 py-14 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-7 order-2 md:order-1">
            <div className="inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <span className="h-1.5 w-1.5 bg-blood animate-pulse rounded-full" />
              Drop 02 live · Only 200 made · Selling fast
            </div>
            <h1 className="font-display text-6xl sm:text-7xl md:text-8xl leading-[0.85] uppercase tracking-tight">
              Only <span className="text-blood">200</span><br />will ever<br />own this.
            </h1>
            <div className="h-px w-24 bg-border" />
            <p className="font-display text-2xl md:text-3xl uppercase leading-tight">
              When it's gone,<br /><span className="text-blood">it's gone for good.</span>
            </p>
            <p className="font-body text-base md:text-lg text-muted-foreground max-w-md">
              240 GSM heavyweight cotton. Hand-numbered 1 to 200. No restocks. No second chances.
              <span className="text-foreground font-medium"> Over 130 already claimed</span> — yours is waiting, but not for long.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#drop" className="group inline-flex items-center gap-3 bg-blood text-foreground px-6 py-4 font-display text-xl uppercase tracking-wide hover:bg-blood/90 shadow-lg shadow-blood/30">
                Claim your number
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a href="#manifesto" className="inline-flex items-center gap-3 border border-border px-6 py-4 font-display text-xl uppercase tracking-wide hover:border-blood">
                Why us
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>★ 4.9 / 5 · 200+ reviews</span><span>★ 48hr dispatch</span><span>★ Easy 7-day exchange</span>
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-3 bg-blood/20 blur-3xl pointer-events-none" />
            <div className="relative aspect-[2/3] bg-ink border border-border overflow-hidden">
              <img src={heroAsset.url} alt="Audace Drop 02" className="w-full h-full object-cover" fetchPriority="high" />
              <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-md border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-blood rounded-full animate-pulse" />Live now</span>
                <span className="text-blood">130 / 200 claimed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT GRID — DROP 02 */}
      <section id="drop" className="mx-auto max-w-7xl px-5 md:px-8 py-16 md:py-24">
        <div className="flex items-end justify-between mb-10 border-b border-border pb-4">
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
        ) : (() => {
          const drop2 = products.filter((p) => getDropForHandle(p.node.handle) === 2);
          return drop2.length === 0 ? (
            <div className="border border-dashed border-border p-16 text-center">
              <p className="font-display text-3xl uppercase">No products found</p>
              <p className="font-mono text-xs uppercase text-muted-foreground mt-2">Drop incoming.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {drop2.map((p) => <ProductCard key={p.node.id} product={p} />)}
            </div>
          );
        })()}
      </section>

      {/* MANIFESTO */}
      <section id="manifesto" className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-5 md:px-8 py-20 md:py-28 text-center space-y-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-blood">// Manifesto</p>
          <h2 className="font-display text-5xl md:text-7xl leading-[0.9] uppercase">
            We don't make<br />clothes for the <span className="text-blood">quiet</span>.
          </h2>
          <p className="max-w-2xl mx-auto font-body text-base md:text-lg text-muted-foreground">
            Audace is for the ones who text first. Who cry at songs. Who fall hard and leave harder.
            Every drop is small on purpose. Wear it like you mean it — because we did.
          </p>
        </div>
      </section>

      <Ticker items={["Audace 2026", "Wear the nerve", "Made for the loud hearts", "Limited · Numbered"]} />

      {/* USP STRIP */}
      <section className="mx-auto max-w-7xl px-5 md:px-8 py-16 grid md:grid-cols-3 gap-px bg-border">
        {[
          { k: "240 GSM only", v: "Oversized French Terry Cotton · the only fabric we make" },
          { k: "48–72 hr delivery", v: "Dispatched within 24 hrs · India-wide" },
          { k: "Numbered run", v: "Drop 01 / 200 · No restocks · No returns" },
        ].map((c) => (
          <div key={c.k} className="bg-background p-8">
            <p className="font-display text-2xl uppercase">{c.k}</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mt-2">{c.v}</p>
          </div>
        ))}
      </section>

      {/* SIZING */}
      <section id="sizing" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood mb-2">// Fit guide</p>
          <h2 className="font-display text-4xl uppercase mb-8">Oversized. Always.</h2>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm border border-border">
              <thead className="bg-card">
                <tr className="text-left uppercase text-[10px] tracking-widest">
                  <th className="p-3 border-b border-border">Size</th>
                  <th className="p-3 border-b border-border">Chest (in)</th>
                  <th className="p-3 border-b border-border">Length (in)</th>
                  <th className="p-3 border-b border-border">Fits</th>
                </tr>
              </thead>
              <tbody>
                {[["S", "44", "27", "5'2 – 5'6"], ["M", "46", "28", "5'6 – 5'10"], ["L", "48", "29", "5'10 – 6'1"], ["XL", "50", "30", "6'1 +"]].map((r) => (
                  <tr key={r[0]} className="border-b border-border last:border-0">
                    {r.map((c, i) => <td key={i} className="p-3">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-12 grid md:grid-cols-3 gap-8 items-start">
          <div>
            <img src={logo} alt="Audace" className="h-10 w-auto mb-3" />
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Wear the nerve · Est. 2026</p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest space-y-2">
            <p className="text-blood">// Connect</p>
            <p className="text-muted-foreground">Instagram · TikTok · Email</p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest space-y-2">
            <p className="text-blood">// Care</p>
            <p className="text-muted-foreground">Wash cold. Hang dry. Wear loud.</p>
          </div>
        </div>
        <div className="border-t border-border py-4 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          © 2026 Audace. All nerves reserved.
        </div>
      </footer>
    </div>
  );
}
