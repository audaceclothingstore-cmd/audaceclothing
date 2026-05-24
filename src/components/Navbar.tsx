import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import logo from "@/assets/audace-logo.png";

export function Navbar() {
  const { items, openCart } = useCartStore();
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="mx-auto max-w-7xl px-5 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Audace" className="h-9 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.18em]">
          <Link to="/" className="hover:text-blood transition-colors">Drop 01</Link>
          <a href="#manifesto" className="hover:text-blood transition-colors">Manifesto</a>
          <a href="#sizing" className="hover:text-blood transition-colors">Sizing</a>
        </nav>
        <button
          onClick={openCart}
          className="relative flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest hover:text-blood transition-colors"
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-3 bg-blood text-foreground text-[10px] h-5 min-w-5 px-1 flex items-center justify-center font-mono">
              {count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
