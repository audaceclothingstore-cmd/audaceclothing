import { useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";

export function CartDrawer() {
  const { items, isOpen, setOpen, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } =
    useCartStore();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const currency = "₹";

  useEffect(() => { if (isOpen) syncCart(); }, [isOpen, syncCart]);

  const checkout = () => {
    const url = getCheckoutUrl();
    if (url) { window.open(url, "_blank"); setOpen(false); }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-background border-l border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="font-display text-3xl uppercase tracking-tight">
            Your <span className="text-blood">Arsenal</span>
          </SheetTitle>
          <SheetDescription className="text-muted-foreground font-mono text-xs uppercase">
            {totalItems === 0 ? "Empty. For now." : `${totalItems} piece${totalItems !== 1 ? "s" : ""} locked in`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="font-mono text-xs uppercase text-muted-foreground">Nothing here yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4 border-b border-border pb-4">
                  <div className="w-20 h-20 bg-secondary overflow-hidden flex-shrink-0">
                    {item.product.node.images?.edges?.[0]?.node && (
                      <img
                        src={item.product.node.images.edges[0].node.url}
                        alt={item.product.node.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display uppercase tracking-tight text-lg leading-tight truncate">
                      {item.product.node.title}
                    </h4>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground mb-2">
                      {item.selectedOptions.map((o) => o.value).join(" · ")}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-mono text-xs">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blood"
                        onClick={() => removeItem(item.variantId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm">
                    {currency}{(parseFloat(item.price.amount) * item.quantity).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5 space-y-4 bg-card">
            <div className="flex justify-between items-baseline">
              <span className="font-mono text-xs uppercase text-muted-foreground">Subtotal</span>
              <span className="font-display text-2xl">{currency}{totalPrice.toFixed(0)}</span>
            </div>
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Prepaid only · Delivery in 8–72 hrs · No returns</p>
            <Button
              onClick={checkout}
              disabled={isLoading || isSyncing}
              className="w-full h-14 rounded-none bg-blood text-foreground hover:bg-blood/90 font-display text-xl uppercase tracking-wide"
            >
              {isLoading || isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>Checkout <ExternalLink className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
