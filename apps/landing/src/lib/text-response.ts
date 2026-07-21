/**
 * Build a one-hour-cached text Response with the right Content-Type header
 * for a static-ish endpoint (robots.txt, security.txt, sitemap.xml).
 *
 * Extracted so the three text endpoints in `pages/` do not duplicate the
 * Cache-Control / Expires scaffolding (a JSCPD-clone target).
 */
export function textResponse(body: string, contentType: string): Response {
  const maxAge = 60 * 60;
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${maxAge}`,
      Expires: new Date(Date.now() + maxAge * 1000).toUTCString(),
    },
  });
}
