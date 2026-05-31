import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useCartSync } from "@/hooks/useCartSync";
import { CartDrawer } from "@/components/CartDrawer";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-8xl text-blood">404</h1>
        <h2 className="mt-4 font-display text-2xl uppercase">Off the grid</h2>
        <p className="mt-2 font-mono text-xs uppercase text-muted-foreground">This page slipped out the back door.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center bg-blood px-6 py-3 font-display text-lg uppercase tracking-wide text-foreground hover:bg-blood/90">
            Back to the drop
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl uppercase">Something broke</h1>
        <p className="mt-2 font-mono text-xs uppercase text-muted-foreground">Try again, soldier.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="bg-blood px-5 py-2 font-display text-lg uppercase text-foreground hover:bg-blood/90">
            Retry
          </button>
          <a href="/" className="border border-border px-5 py-2 font-display text-lg uppercase hover:border-blood">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AUDACE — Wear the Nerve · Limited Edition Streetwear" },
      { name: "description", content: "Audace. Limited edition oversized tees for the ones who feel too much and apologize for none of it. Wear the nerve." },
      { name: "author", content: "AUDACE" },
      { property: "og:title", content: "AUDACE — Wear the Nerve · Limited Edition Streetwear" },
      { property: "og:description", content: "Audace. Limited edition oversized tees for the ones who feel too much and apologize for none of it. Wear the nerve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AUDACE — Wear the Nerve · Limited Edition Streetwear" },
      { name: "twitter:description", content: "Audace. Limited edition oversized tees for the ones who feel too much and apologize for none of it. Wear the nerve." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Ip44evKMcrNm5y0Jj9QorKR7w063/social-images/social-1779615954740-ChatGPT_Image_May_24,_2026,_01_58_36_PM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Ip44evKMcrNm5y0Jj9QorKR7w063/social-images/social-1779615954740-ChatGPT_Image_May_24,_2026,_01_58_36_PM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
    scripts: [
      {
        children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1510599900547470');fbq('track','PageView');`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1510599900547470&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function MetaPixelTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);
  return null;
}

function AppShell() {
  useCartSync();
  return (
    <>
      <Outlet />
      <CartDrawer />
      <MetaPixelTracker />
      <Toaster position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
