import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";
import { PRODUCT_BY_HANDLE_QUERY, PRODUCTS_QUERY, storefrontApiRequest, type ShopifyProduct, shopifyImg } from "@/lib/shopify";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import { trackPixel } from "@/lib/metaPixel";
import { getDropForHandle, formatDropLabel } from "@/lib/drops";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Truck, Flame, Lock, RefreshCw, Zap } from "lucide-react";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
});

function ProductPage() {
  const { handle } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
      const node = res?.data?.product;
      return node ? ({ node } as ShopifyProduct) : null;
    },
  });

  const product = data;
  const variants = product?.node.variants.edges ?? [];
  const [variantId, setVariantId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sizeError, setSizeError] = useState(false);

  const selected = useMemo(
    () => variants.find((v) => v.node.id === variantId) ?? variants[0],
    [variants, variantId]
  );

  const addItem = useCartStore((s) => s.addItem);
  const isLoadingCart = useCartStore((s) => s.isLoading);
  const openCart = useCartStore((s) => s.openCart);

  // Fire ViewContent once per product (not on size change). Uses the
  // current/first variant for price+id so Meta still gets value+currency.
  useEffect(() => {
    if (!product) return;
    const first = product.node.variants.edges[0]?.node;
    if (!first) return;
    trackPixel("ViewContent", {
      content_ids: [first.id],
      content_name: product.node.title,
      content_type: "product",
      value: parseFloat(first.price.amount),
      currency: first.price.currencyCode,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.node.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-5 md:px-8 py-20 grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-card animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-card animate-pulse" />
            <div className="h-6 w-1/3 bg-card animate-pulse" />
            <div className="h-24 bg-card animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-5 py-32 text-center">
          <p className="font-display text-5xl uppercase">Gone.</p>
          <p className="font-mono text-xs uppercase text-muted-foreground mt-2">This drop is over.</p>
          <Link to="/" className="inline-block mt-6 bg-blood px-6 py-3 font-display text-xl uppercase">Back home</Link>
        </div>
      </div>
    );
  }

  const p = product.node;
  const images = p.images.edges;
  const price = parseFloat(selected.node.price.amount);
  const compare = selected.node.compareAtPrice ? parseFloat(selected.node.compareAtPrice.amount) : null;
  const cur = "₹";
  const userPickedSize = !!variantId;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / width);
    setActiveIndex(Math.min(newIndex, images.length - 1));
  };

  const handleAdd = async () => {
    if (!userPickedSize && variants.length > 1) {
      setSizeError(true);
      // scroll to size picker
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSizeError(false);
    await addItem({
      product,
      variantId: selected.node.id,
      variantTitle: selected.node.title,
      price: selected.node.price,
      quantity: 1,
      selectedOptions: selected.node.selectedOptions,
    });
    openCart();
  };

  const handleBuyNow = async () => {
    if (!userPickedSize && variants.length > 1) {
      setSizeError(true);
      document.getElementById("size-picker")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSizeError(false);
    trackPixel("InitiateCheckout", {
      content_ids: [selected.node.id],
      value: price,
      currency: selected.node.price.currencyCode,
    });
    await addItem({
      product,
      variantId: selected.node.id,
      variantTitle: selected.node.title,
      price: selected.node.price,
      quantity: 1,
      selectedOptions: selected.node.selectedOptions,
    });
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-8 md:py-16">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-blood">← Back to drop</Link>

        <div className="mt-6 grid md:grid-cols-2 gap-10">
          {/* GALLERY */}
          <div className="space-y-3 min-w-0 w-full">
            <div className="relative">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="relative w-full max-w-full aspect-square bg-bone border border-border flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide overscroll-x-contain touch-pan-x"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {images.map((im, i) => (
                  <div key={i} className="shrink-0 basis-full w-full h-full snap-start snap-always">
                    <img
                      src={shopifyImg(im.node.url, 1200, 1200)}
                      alt={im.node.altText ?? p.title}
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding="async"
                      {...(i === 0 ? { fetchPriority: "high" as const } : {})}
                      className="block w-full h-full object-cover pointer-events-none select-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
              {/* Image index badge — signals swipeability on mobile */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-ink/80 backdrop-blur px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest border border-border">
                  {activeIndex + 1} / {images.length}
                </div>
              )}
              {/* Dots */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full transition-all ${i === activeIndex ? "bg-blood w-4" : "bg-foreground/40"}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:flex gap-2 overflow-x-auto scrollbar-hide pb-1 overscroll-x-contain">
              {images.slice(0, 8).map((im, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (!scrollRef.current) return;
                    scrollRef.current.scrollTo({
                      left: i * scrollRef.current.offsetWidth,
                      behavior: "smooth",
                    });
                    setActiveIndex(i);
                  }}
                  className={`flex-shrink-0 w-20 h-20 bg-bone border overflow-hidden snap-start cursor-pointer transition-colors ${
                    i === activeIndex ? "border-blood" : "border-border hover:border-blood/60"
                  }`}
                >
                  <img src={shopifyImg(im.node.url, 160, 160)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover pointer-events-none" />
                </button>
              ))}
            </div>
          </div>

          {/* INFO */}
          <div className="space-y-6 min-w-0">
            <div className="inline-flex items-center gap-2 border border-blood text-blood px-3 py-1 font-mono text-[10px] uppercase tracking-widest">
              <Flame className="h-3 w-3" /> Limited · {formatDropLabel(getDropForHandle(handle))} / 200
            </div>
            <h1 className="font-display text-4xl md:text-6xl uppercase leading-[0.9]">{p.title}</h1>

            {/* Above-the-fold proof */}
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              ★ <span className="text-foreground">4.9</span> · Worn by 130+ in India
            </p>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-4xl text-blood">{cur}{price.toFixed(0)}</span>
              {compare && compare > price && (
                <>
                  <span className="font-mono text-lg line-through text-muted-foreground">{cur}{compare.toFixed(0)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest bg-blood px-2 py-0.5">Save {Math.round(((compare - price) / compare) * 100)}%</span>
                </>
              )}
            </div>

            {/* Size selector */}
            {p.options[0] && (
              <div id="size-picker" className="space-y-2 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${sizeError ? "text-blood" : ""}`}>
                    {sizeError ? "Pick a size to continue" : `Size · ${selected.node.selectedOptions[0]?.value}`}
                  </p>
                  <a href="#sizing" className="font-mono text-[10px] uppercase underline text-muted-foreground">Size guide</a>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {variants.map((v) => {
                    const isSel = userPickedSize && v.node.id === selected.node.id;
                    const sold = !v.node.availableForSale;
                    return (
                      <button
                        key={v.node.id}
                        disabled={sold}
                        onClick={() => { setVariantId(v.node.id); setSizeError(false); }}
                        className={`relative py-3 font-display text-lg uppercase border transition-colors ${
                          isSel ? "bg-foreground text-background border-foreground" : sizeError ? "border-blood/60" : "border-border hover:border-blood"
                        } ${sold ? "opacity-50 cursor-not-allowed bg-card" : ""}`}
                      >
                        <span className={sold ? "line-through" : ""}>{v.node.title}</span>
                        {sold && (
                          <span className="absolute -bottom-4 left-0 right-0 text-[8px] font-mono uppercase tracking-widest text-muted-foreground">Sold out</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary CTA */}
            <button
              onClick={handleAdd}
              disabled={isLoadingCart || !selected.node.availableForSale}
              className="w-full h-14 md:h-16 bg-blood hover:bg-blood/90 font-display text-xl md:text-2xl uppercase tracking-wide text-foreground disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoadingCart ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Add to cart · {cur}{price.toFixed(0)}</>}
            </button>

            {/* Buy now — express checkout */}
            <button
              onClick={handleBuyNow}
              disabled={isLoadingCart || !selected.node.availableForSale}
              className="w-full h-12 md:h-14 bg-foreground hover:bg-foreground/90 font-display text-lg md:text-xl uppercase tracking-wide text-background disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" /> Buy it now
            </button>

            {/* Trust line — reframed: lead with positive, drop scary language */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4 text-blood" /> 48–72 hr delivery</div>
              <div className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="h-4 w-4 text-blood" /> 7-day exchange</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Lock className="h-4 w-4 text-blood" /> Secure checkout</div>
            </div>

            {/* Payment methods row — concrete logos build more trust than generic badges */}
            <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mr-2">Pay with</span>
              {["UPI", "Visa", "RuPay", "Net banking"].map((m) => (
                <span key={m} className="font-mono text-[10px] uppercase tracking-widest border border-border px-2 py-1">
                  {m}
                </span>
              ))}
            </div>

            {/* Description */}
            <p className="font-body text-base text-muted-foreground max-w-prose">{p.description}</p>

            {/* Collapsed details + policy — single accordion replaces two redundant blocks */}
            <Accordion type="single" collapsible className="border-t border-border">
              <AccordionItem value="details">
                <AccordionTrigger className="font-mono text-[11px] uppercase tracking-widest">Fabric & fit</AccordionTrigger>
                <AccordionContent>
                  <ul className="font-mono text-xs text-muted-foreground space-y-1">
                    <li>· 240 GSM Oversized French Terry Cotton</li>
                    <li>· Heavyweight structured drape · soft brushed interior</li>
                    <li>· Garment washed for that worn-in feel</li>
                    <li>· Drop shoulder · boxy oversized cut</li>
                    <li>· Plastisol back print, made to last</li>
                    <li>· Pre-shrunk · Pre-washed</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ship">
                <AccordionTrigger className="font-mono text-[11px] uppercase tracking-widest">Shipping & exchange</AccordionTrigger>
                <AccordionContent>
                  <ul className="font-mono text-xs text-muted-foreground space-y-1">
                    <li>· Dispatch within 24 hrs · delivery 48–72 hrs across India</li>
                    <li>· Free shipping over ₹1499</li>
                    <li>· UPI, cards, net banking accepted at checkout</li>
                    <li>· 7-day size exchange · defects replaced free (report within 24 hrs)</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-fit">
                <AccordionTrigger className="font-mono text-[11px] uppercase tracking-widest">Will it shrink? Between sizes?</AccordionTrigger>
                <AccordionContent className="font-body text-sm text-muted-foreground">
                  Pre-shrunk and pre-washed — what you see is what you get. If you're between sizes, go down — the oversized cut is intentionally roomy.
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Sizing table anchor */}
            <div id="sizing" className="border-t border-border pt-5 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-blood">// Size guide</p>
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs border border-border">
                  <thead className="bg-card">
                    <tr className="text-left uppercase text-[10px] tracking-widest">
                      <th className="p-2 border-b border-border">Size</th>
                      <th className="p-2 border-b border-border">Chest (in)</th>
                      <th className="p-2 border-b border-border">Length (in)</th>
                      <th className="p-2 border-b border-border">Fits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["S","44","27","5'2–5'6"],["M","46","28","5'6–5'10"],["L","48","29","5'10–6'1"],["XL","50","30","6'1+"]].map((r) => (
                      <tr key={r[0]} className="border-b border-border last:border-0">
                        {r.map((c, i) => <td key={i} className="p-2">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* MORE FROM THE DROP */}
        <MoreFromDrop currentHandle={handle} />
      </div>

      {/* MOBILE STICKY BUY BAR — now with inline size chips */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 space-y-2">
        {variants.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {variants.map((v) => {
              const isSel = userPickedSize && v.node.id === selected.node.id;
              const sold = !v.node.availableForSale;
              return (
                <button
                  key={v.node.id}
                  disabled={sold}
                  onClick={() => { setVariantId(v.node.id); setSizeError(false); }}
                  className={`flex-shrink-0 min-w-10 h-8 px-2 font-display text-sm uppercase border transition-colors ${
                    isSel ? "bg-foreground text-background border-foreground" : sizeError ? "border-blood text-blood" : "border-border"
                  } ${sold ? "opacity-40 line-through" : ""}`}
                >
                  {v.node.title}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg text-blood leading-none">{cur}{price.toFixed(0)}</span>
              {compare && compare > price && (
                <span className="font-mono text-[10px] line-through text-muted-foreground">{cur}{compare.toFixed(0)}</span>
              )}
            </div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">48hr · 7-day exchange</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isLoadingCart || !selected.node.availableForSale}
            className="h-11 px-3 border border-blood text-blood font-display text-sm uppercase tracking-wide disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={handleBuyNow}
            disabled={isLoadingCart || !selected.node.availableForSale}
            className="h-11 px-4 bg-blood font-display text-sm uppercase tracking-wide text-foreground disabled:opacity-50 flex items-center gap-1.5"
          >
            {isLoadingCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="h-3.5 w-3.5" /> Buy</>}
          </button>
        </div>
      </div>
      <div className="md:hidden h-28" />
    </div>
  );
}


function MoreFromDrop({ currentHandle }: { currentHandle: string }) {
  const currentDrop = getDropForHandle(currentHandle);
  const { data, isLoading } = useQuery({
    queryKey: ["products", "more"],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCTS_QUERY, { first: 20, query: null });
      return (res?.data?.products?.edges ?? []) as ShopifyProduct[];
    },
  });
  const others = (data ?? [])
    .filter((p) => p.node.handle !== currentHandle && getDropForHandle(p.node.handle) === currentDrop)
    .slice(0, 3);

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood mb-2">// More from</p>
          <h2 className="font-display text-4xl uppercase">{formatDropLabel(currentDrop)}</h2>
        </div>
        <Link to="/" hash="drop" className="font-mono text-[10px] uppercase tracking-widest hover:text-blood">See the full drop →</Link>
      </div>
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/5] bg-card border border-border animate-pulse" />)}
        </div>
      ) : others.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center">
          <p className="font-display text-2xl uppercase">More dropping soon.</p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mt-2">Next pieces in the works.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {others.map((p) => <ProductCard key={p.node.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
