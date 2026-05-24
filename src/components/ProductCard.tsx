import { Link } from "@tanstack/react-router";
import type { ShopifyProduct } from "@/lib/shopify";

export function ProductCard({ product }: { product: ShopifyProduct }) {
  const p = product.node;
  const img = p.images.edges[0]?.node;
  const price = parseFloat(p.priceRange.minVariantPrice.amount);
  const compare = p.variants.edges[0]?.node.compareAtPrice
    ? parseFloat(p.variants.edges[0].node.compareAtPrice!.amount)
    : null;
  const cur = p.priceRange.minVariantPrice.currencyCode === "USD" ? "$" : p.priceRange.minVariantPrice.currencyCode + " ";

  return (
    <Link
      to="/product/$handle"
      params={{ handle: p.handle }}
      className="group block relative overflow-hidden border border-border bg-card transition-colors hover:border-blood"
    >
      <div className="relative aspect-square bg-bone overflow-hidden">
        {img && (
          <img
            src={img.url}
            alt={img.altText ?? p.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {compare && compare > price && (
          <span className="absolute top-3 left-3 bg-blood text-foreground font-mono text-[10px] uppercase tracking-wider px-2 py-1">
            −{Math.round(((compare - price) / compare) * 100)}%
          </span>
        )}
        <span className="absolute top-3 right-3 bg-ink text-foreground font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-border">
          Limited
        </span>
      </div>
      <div className="p-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display uppercase text-xl leading-none tracking-tight truncate">{p.title}</h3>
          <p className="font-mono text-[10px] uppercase text-muted-foreground mt-1">Drop 01 · Oversized</p>
        </div>
        <div className="text-right">
          {compare && compare > price && (
            <div className="font-mono text-[11px] line-through text-muted-foreground">{cur}{compare.toFixed(0)}</div>
          )}
          <div className="font-display text-2xl text-blood leading-none">{cur}{price.toFixed(0)}</div>
        </div>
      </div>
    </Link>
  );
}
