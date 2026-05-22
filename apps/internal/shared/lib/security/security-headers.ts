/** Cloudflare Web Analytics beacon (injected on Cloudflare-hosted deploys). */
const CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ORIGIN =
  "https://static.cloudflareinsights.com";
const CLOUDFLARE_WEB_ANALYTICS_CONNECT_ORIGIN =
  "https://cloudflareinsights.com";

const isCloudflareDeploy = process.env["DOCITA_CLOUDFLARE"] === "1";

function resolveConnectSources(): string[] {
  const sources = new Set<string>(["'self'", "https://*.sentry.io"]);
  const proxyTarget = process.env["API_PROXY_TARGET"]?.trim();
  if (proxyTarget) {
    try {
      sources.add(new URL(proxyTarget).origin);
    } catch {
      // Ignore invalid proxy target; browser traffic should use same-origin /api/v1.
    }
  }
  if (isCloudflareDeploy) {
    sources.add(CLOUDFLARE_WEB_ANALYTICS_CONNECT_ORIGIN);
  }
  return [...sources];
}

export function buildInternalContentSecurityPolicy(): string {
  const isProduction = process.env["NODE_ENV"] === "production";
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    isCloudflareDeploy ? CLOUDFLARE_WEB_ANALYTICS_SCRIPT_ORIGIN : undefined,
    !isProduction ? "'unsafe-eval'" : undefined,
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
    `script-src ${Array.from(new Set(scriptSources)).join(" ")}`,
    `connect-src ${Array.from(new Set(resolveConnectSources())).join(" ")}`,
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    isProduction ? "upgrade-insecure-requests" : undefined,
  ]
    .filter((directive): directive is string => Boolean(directive))
    .join("; ");
}

export const INTERNAL_SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: buildInternalContentSecurityPolicy(),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
] as const;

export function applyInternalSecurityHeaders(
  response: NextResponse,
): NextResponse {
  for (const { key, value } of INTERNAL_SECURITY_HEADERS) {
    response.headers.set(key, value);
  }

  return response;
}

type NextResponse = import("next/server").NextResponse;
