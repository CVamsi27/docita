import type { APIRoute } from "astro";

const BASE_URL = "https://landing.docita.work";

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`;

  const maxAge = 60 * 60;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${maxAge}`,
      Expires: new Date(Date.now() + maxAge * 1000).toUTCString(),
    },
  });
};
