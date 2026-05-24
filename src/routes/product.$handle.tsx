import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PRODUCT_BY_HANDLE_QUERY, PRODUCTS_QUERY, storefrontApiRequest, type ShopifyProduct } from "@/lib/shopify";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cartStore";
import { Loader2, Truck, Flame, CreditCard, PackageX, BadgeCheck, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
});

function ProductPage() {
  const { handle } = Route.useParams();
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
  const selected = useMemo(
    () => variants.find((v) => v.node.id === variantId) ?? variants[0],
    [variants, variantId]
  );

  const addItem = useCartStore((s) => s.addItem);
  const isLoadingCart = useCartStore((s) => s.isLoading);

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
  const img = p.images.edges[0]?.node;
  const price = parseFloat(selected.node.price.amount);
  const compare = selected.node.compareAtPrice ? parseFloat(selected.node.compareAtPrice.amount) : null;
  const cur = "₹";

  const handleAdd = async () => {
    await addItem({
      product,
      variantId: selected.node.id,
      variantTitle: selected.node.title,
      price: selected.node.price,
      quantity: 1,
      selectedOptions: selected.node.selectedOptions,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto max-w-7xl px-5 md:px-8 py-10 md:py-16">
        <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-blood">← Back to drop</Link>

        <div className="mt-6 grid md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <div className="aspect-square bg-bone border border-border overflow-hidden">
              {img && <img src={img.url} alt={img.altText ?? p.title} className="w-full h-full object-cover" />}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {p.images.edges.slice(0, 4).map((im, i) => (
                <div key={i} className="aspect-square bg-bone border border-border overflow-hidden">
                  <img src={im.node.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 border border-blood text-blood px-3 py-1 font-mono text-[10px] uppercase tracking-widest">
              <Flame className="h-3 w-3" /> Limited · Drop 01 / 200
            </div>
            <h1 className="font-display text-5xl md:text-6xl uppercase leading-[0.9]">{p.title}</h1>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl text-blood">{cur}{price.toFixed(0)}</span>
              {compare && compare > price && (
                <>
                  <span className="font-mono text-lg line-through text-muted-foreground">{cur}{compare.toFixed(0)}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest bg-blood px-2 py-0.5">Save {Math.round(((compare - price) / compare) * 100)}%</span>
                </>
              )}
            </div>

            <p className="font-body text-base text-muted-foreground max-w-prose">{p.description}</p>

            {/* Size selector */}
            {p.options[0] && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-widest">Size · {selected.node.selectedOptions[0]?.value}</p>
                  <a href="#sizing" className="font-mono text-[10px] uppercase underline text-muted-foreground">Size guide</a>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {variants.map((v) => {
                    const isSel = v.node.id === selected.node.id;
                    return (
                      <button
                        key={v.node.id}
                        disabled={!v.node.availableForSale}
                        onClick={() => setVariantId(v.node.id)}
                        className={`py-3 font-display text-lg uppercase border transition-colors ${
                          isSel ? "bg-foreground text-background border-foreground" : "border-border hover:border-blood"
                        } ${!v.node.availableForSale ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                      >
                        {v.node.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={handleAdd}
              disabled={isLoadingCart || !selected.node.availableForSale}
              className="w-full h-16 bg-blood hover:bg-blood/90 font-display text-2xl uppercase tracking-wide text-foreground disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoadingCart ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Add to cart · {cur}{price.toFixed(0)}</>}
            </button>

            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4 text-blood" /> 48–72 hr delivery</div>
              <div className="flex items-center gap-2 text-muted-foreground"><CreditCard className="h-4 w-4 text-blood" /> Prepaid only</div>
              <div className="flex items-center gap-2 text-muted-foreground"><PackageX className="h-4 w-4 text-blood" /> No returns</div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground border-y border-border py-3">
              <span className="flex items-center gap-1.5"><Lock className="h-3 w-3 text-blood" /> Secure checkout</span>
              <span className="flex items-center gap-1.5"><BadgeCheck className="h-3 w-3 text-blood" /> QC verified</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-blood" /> Made in India</span>
            </div>

            <div className="border-t border-border pt-5 space-y-2 font-mono text-xs">
              <p className="text-blood uppercase tracking-widest text-[10px]">// Details</p>
              <ul className="text-muted-foreground space-y-1">
                <li>· 240gsm heavyweight combed cotton</li>
                <li>· Garment washed for that worn-in feel</li>
                <li>· Drop shoulder, boxy oversized cut</li>
                <li>· Plastisol back print, made to last</li>
                <li>· Pre-shrunk · Pre-washed · Stitched to outlast trends</li>
              </ul>
            </div>

            <div className="border-t border-border pt-5 space-y-2 font-mono text-xs">
              <p className="text-blood uppercase tracking-widest text-[10px]">// Shipping & policy</p>
              <ul className="text-muted-foreground space-y-1">
                <li>· Dispatch within 24 hrs · delivery 48–72 hrs across India</li>
                <li>· Prepaid orders only (UPI · Cards · Net banking · Wallets)</li>
                <li>· No returns or exchanges — limited drop, every piece is numbered</li>
                <li>· Size exchange only for manufacturing defects (report in 24 hrs)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* MORE FROM THE DROP */}
        <MoreFromDrop currentHandle={handle} />
      </div>

      {/* MOBILE STICKY BUY BAR */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl text-blood leading-none">{cur}{price.toFixed(0)}</span>
            {compare && compare > price && (
              <span className="font-mono text-[11px] line-through text-muted-foreground">{cur}{compare.toFixed(0)}</span>
            )}
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Prepaid · 48–72 hr delivery</p>
        </div>
        <button
          onClick={handleAdd}
          disabled={isLoadingCart || !selected.node.availableForSale}
          className="h-12 px-5 bg-blood font-display text-lg uppercase tracking-wide text-foreground disabled:opacity-50 flex items-center gap-2"
        >
          {isLoadingCart ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to cart"}
        </button>
      </div>
      <div className="md:hidden h-20" />
    </div>
  );
}


function MoreFromDrop({ currentHandle }: { currentHandle: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "more"],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCTS_QUERY, { first: 8, query: null });
      return (res?.data?.products?.edges ?? []) as ShopifyProduct[];
    },
  });
  const others = (data ?? []).filter((p) => p.node.handle !== currentHandle).slice(0, 3);

  return (
    <section className="mt-20 border-t border-border pt-12">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3 border-b border-border pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-blood mb-2">// More from</p>
          <h2 className="font-display text-4xl uppercase">Drop 01</h2>
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
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mt-2">Drop 02 in the works.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {others.map((p) => <ProductCard key={p.node.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
