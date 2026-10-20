import { applySecurityHeaders, BASE_SECURITY_HEADERS } from "@workspace/utils";

const PUBLIC_APP_URL =
  import.meta.env.PUBLIC_APP_URL || "https://app.docita.work";
const CLOUDFLARE_TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
const GOOGLE_ANALYTICS_SCRIPT_ORIGIN = "https://www.googletagmanager.com";
const GOOGLE_ANALYTICS_CONNECT_ORIGIN = "https://www.google-analytics.com";
const GOOGLE_FONTS_STYLES_ORIGIN = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES_ORIGIN = "https://fonts.gstatic.com";

function toOrigin(source: string): string {
  try {
    return new URL(source).origin;
  } catch {
    return source;
  }
}

function buildLandingContentSecurityPolicy(): string {
  const connectSources = ["'self'", CLOUDFLARE_TURNSTILE_ORIGIN];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    `font-src 'self' data: ${GOOGLE_FONTS_FILES_ORIGIN}`,
    `style-src 'self' 'unsafe-inline' ${GOOGLE_FONTS_STYLES_ORIGIN}`,
    `script-src 'self' 'unsafe-inline' ${CLOUDFLARE_TURNSTILE_ORIGIN} ${GOOGLE_ANALYTICS_SCRIPT_ORIGIN}`,
    `connect-src ${Array.from(new Set([...connectSources, GOOGLE_ANALYTICS_CONNECT_ORIGIN])).join(" ")}`,
    `frame-src ${CLOUDFLARE_TURNSTILE_ORIGIN}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `navigate-to 'self' ${toOrigin(PUBLIC_APP_URL)} mailto:`,
    ...(!import.meta.env.DEV ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const LANDING_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: buildLandingContentSecurityPolicy(),
  },
  ...BASE_SECURITY_HEADERS,
] as const;

export function applyLandingSecurityHeaders(response: Response): Response {
  return applySecurityHeaders(response, LANDING_SECURITY_HEADERS);
}
