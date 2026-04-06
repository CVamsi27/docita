import type { APIRoute } from "astro";

const BASE_URL = "https://landing.docita.work";

const routes = [
  { path: "", lastmod: new Date().toISOString().split("T")[0], priority: "1.0", changefreq: "weekly" },
  { path: "/contact", lastmod: new Date().toISOString().split("T")[0], priority: "0.8", changefreq: "monthly" },
  { path: "/privacy", lastmod: "2025-11-26", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", lastmod: "2025-11-26", priority: "0.5", changefreq: "yearly" },
  { path: "/refund-policy", lastmod: "2026-03-09", priority: "0.4", changefreq: "yearly" },
  { path: "/cookies", lastmod: "2026-03-15", priority: "0.4", changefreq: "yearly" },
];

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
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
`;

  const maxAge = 60 * 60;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`,
      Expires: new Date(Date.now() + maxAge * 1000).toUTCString(),
    },
  });
};
