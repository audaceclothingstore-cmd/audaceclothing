import { useEffect } from "react";
import { useCartStore } from "@/stores/cartStore";

export function useCartSync() {
  const syncCart = useCartStore((s) => s.syncCart);
  useEffect(() => {
    syncCart();
    const h = () => { if (document.visibilityState === "visible") syncCart(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [syncCart]);
}
