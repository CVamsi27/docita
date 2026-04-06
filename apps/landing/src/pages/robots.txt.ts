import type { APIRoute } from "astro";

const BASE_URL = "https://docita.work";

export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /
Sitemap: ${BASE_URL}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
