declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[] };
    _fbq?: unknown;
  }
}

// Simple unique id for event deduplication on Meta's side.
function makeEventId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Track a Meta Pixel standard event.
 * - Always attaches a unique `eventID` for Meta-side dedup.
 * - Safe on SSR (no-op).
 * - Warns once if the pixel hasn't booted, to surface bad installs.
 */
let warned = false;
export function trackPixel(
  eventName: string,
  params?: Record<string, unknown>,
  options?: { eventID?: string }
) {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    if (!warned) {
      warned = true;
      // eslint-disable-next-line no-console
      console.warn("[MetaPixel] fbq is not available — event dropped:", eventName);
    }
    return;
  }
  const eventID = options?.eventID ?? makeEventId();
  window.fbq("track", eventName, params ?? {}, { eventID });
}

/** Fire the canonical PageView event (used by the SPA route tracker). */
export function trackPageView() {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView", {}, { eventID: makeEventId() });
}
