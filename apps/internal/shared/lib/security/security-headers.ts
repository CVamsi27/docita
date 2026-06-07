import {
  applySecurityHeaders,
  BASE_SECURITY_HEADERS,
} from "@workspace/utils";

const DEFAULT_CONNECT_SOURCES = [
  "'self'",
  "https://api.docita.work",
  "https://*.sentry.io",
] as const;

const CLOUDFLARE_INSIGHTS_SCRIPT_SOURCE = "https://static.cloudflareinsights.com";
const CLOUDFLARE_INSIGHTS_CONNECT_SOURCE = "https://cloudflareinsights.com";

interface InternalCspOptions {
  /** Per-request nonce. When supplied production policy drops 'unsafe-inline'. */
  nonce?: string;
  /** Forces production semantics regardless of NODE_ENV. */
  isProduction?: boolean;
}

/**
 * Build the Internal Console CSP.
 *
 * Production policy uses nonce + 'strict-dynamic' so we never need
 * 'unsafe-inline' in script-src. Dev keeps 'unsafe-inline' so HMR
 * (which injects unsignable inline scripts) keeps working.
 */
export function buildInternalContentSecurityPolicy(
  options: InternalCspOptions = {},
): string {
  const isProduction =
    options.isProduction ?? process.env["NODE_ENV"] === "production";
  const isCloudflareBuild = process.env["DOCITA_CLOUDFLARE"] === "1";
  const nonce = options.nonce;

  const scriptSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : undefined,
    nonce ? "'strict-dynamic'" : undefined,
    !nonce ? "'unsafe-inline'" : undefined,
    isCloudflareBuild ? CLOUDFLARE_INSIGHTS_SCRIPT_SOURCE : undefined,
    !isProduction ? "'unsafe-eval'" : undefined,
  ].filter((source): source is string => Boolean(source));

  const connectSources = [
    ...DEFAULT_CONNECT_SOURCES,
    isCloudflareBuild ? CLOUDFLARE_INSIGHTS_CONNECT_SOURCE : undefined,
  ].filter((source): source is string => Boolean(source));

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(" ")}`,
    `connect-src ${connectSources.join(" ")}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    isProduction ? "upgrade-insecure-requests" : undefined,
  ]
    .filter((directive): directive is string => Boolean(directive))
    .join("; ");
}

/**
 * Static fallback used when middleware can't supply a per-request nonce
 * (e.g., dev). In production the middleware overrides this with the
 * nonce-bound policy on every request.
 */
const STATIC_INTERNAL_CSP = buildInternalContentSecurityPolicy();

const INTERNAL_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: STATIC_INTERNAL_CSP,
  },
  ...BASE_SECURITY_HEADERS,
] as const;

export function applyInternalSecurityHeaders(
  response: NextResponse,
): NextResponse {
  return applySecurityHeaders(response, INTERNAL_SECURITY_HEADERS);
}

type NextResponse = import("next/server").NextResponse;
