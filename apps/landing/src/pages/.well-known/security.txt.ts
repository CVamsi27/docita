import type { APIRoute } from "astro";

const BASE_URL = "https://docita.work";

export const GET: APIRoute = () => {
  const body = `Contact: mailto:support@docita.work
Preferred-Languages: en
Canonical: ${BASE_URL}/.well-known/security.txt
Policy: ${BASE_URL}/privacy
Expires: 2027-05-12T00:00:00Z
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
