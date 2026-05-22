
/** Browser traffic uses same-origin /api/v1; Cloudflare/production proxies via app/api/v1. */
const DEFAULT_API_URL = "/api/v1";

export const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || DEFAULT_API_URL;
