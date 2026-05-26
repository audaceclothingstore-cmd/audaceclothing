import { createFileRoute } from "@tanstack/react-router";

const BASE_URL = "https://audaceclothing.store";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/checkout", changefreq: "monthly", priority: "0.5" },
          { path: "/order/success", changefreq: "monthly", priority: "0.3" },
          { path: "/order/failure", changefreq: "monthly", priority: "0.3" },
        ];

        // Fetch product handles from Shopify for dynamic routes
        try {
          const response = await fetch(
            `https://s1afkk-c2.myshopify.com/api/2025-07/graphql.json`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Storefront-Access-Token": "0610cf13f9bf6ed94f424c313efbe9d0",
              },
              body: JSON.stringify({
                query: `
                  query GetProductHandles($first: Int!) {
                    products(first: $first) {
                      edges {
                        node {
                          handle
                          updatedAt
                        }
                      }
                    }
                  }
                `,
                variables: { first: 50 },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const products = data?.data?.products?.edges ?? [];
            for (const p of products) {
              entries.push({
                path: `/product/${p.node.handle}`,
                changefreq: "weekly",
                priority: "0.8",
                lastmod: p.node.updatedAt
                  ? new Date(p.node.updatedAt).toISOString().split("T")[0]
                  : undefined,
              });
            }
          }
        } catch {
          // If Shopify fetch fails, serve static routes only
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n")
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
