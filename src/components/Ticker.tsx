export function Ticker({ items, className = "" }: { items: string[]; className?: string }) {
  const all = [...items, ...items, ...items];
  return (
    <div className={`overflow-hidden border-y border-border bg-blood py-3 ${className}`}>
      <div className="flex whitespace-nowrap animate-ticker font-display text-xl uppercase tracking-wide">
        {all.map((t, i) => (
          <span key={i} className="mx-6 flex items-center gap-6 text-foreground">
            {t}
            <span className="text-foreground/60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
