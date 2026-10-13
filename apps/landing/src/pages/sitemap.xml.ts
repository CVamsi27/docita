import type { APIRoute } from "astro";
import { textResponse } from "@/lib/text-response";
import { seoLandingPages } from "@/lib/seo-pages";

const BASE_URL = "https://docita.work";

const routes = [
  { path: "/product", lastmod: "2026-10-13", priority: "0.9", changefreq: "monthly" },
  { path: "/pricing", lastmod: "2026-10-13", priority: "0.9", changefreq: "monthly" },
  { path: "", lastmod: new Date().toISOString().split("T")[0], priority: "1.0", changefreq: "weekly" },
  { path: "/contact", lastmod: new Date().toISOString().split("T")[0], priority: "0.8", changefreq: "monthly" },
  { path: "/trust", lastmod: "2026-06-11", priority: "0.7", changefreq: "monthly" },
  { path: "/paper-to-cloud", lastmod: "2026-06-11", priority: "0.7", changefreq: "monthly" },
  { path: "/whatsapp-workflows", lastmod: "2026-06-11", priority: "0.7", changefreq: "monthly" },
  ...seoLandingPages.map((page) => ({
    path: `/${page.slug}`,
    lastmod: "2026-06-11",
    priority: "0.8",
    changefreq: "monthly",
  })),
  { path: "/privacy", lastmod: "2025-11-26", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", lastmod: "2025-11-26", priority: "0.5", changefreq: "yearly" },
  { path: "/refund-policy", lastmod: "2026-03-09", priority: "0.4", changefreq: "yearly" },
  { path: "/cookies", lastmod: "2026-03-15", priority: "0.4", changefreq: "yearly" },
];

export const GET: APIRoute = () =>
  textResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `<url>
  <loc>${BASE_URL}${route.path}</loc>
  <lastmod>${route.lastmod}</lastmod>
  <changefreq>${route.changefreq}</changefreq>
  <priority>${route.priority}</priority>
</url>`,
  )
  .join("\n")}
</urlset>
`,
    "application/xml; charset=utf-8",
  );
