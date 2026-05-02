const DEFAULT_PUBLIC_API_URL =
  process.env["DOCITA_CLOUDFLARE"] === "1"
    ? "https://api.docita.work/api/v1"
    : "http://localhost:3001/api/v1";
const DEFAULT_PUBLIC_APP_URL =
  process.env["DOCITA_CLOUDFLARE"] === "1"
    ? "https://app.docita.work"
    : "http://localhost:3000";
const DEFAULT_PUBLIC_SOCKET_URL =
  process.env["DOCITA_CLOUDFLARE"] === "1"
    ? "https://api.docita.work"
    : "http://localhost:3001";

function toOrigin(source: string): string {
  try {
    return new URL(source).origin;
  } catch {
    return source;
  }
}

function toWebSocketOrigin(source: string): string | undefined {
  try {
    const url = new URL(source);
    if (url.protocol === "http:") {
      url.protocol = "ws:";
      return url.origin;
    }
    if (url.protocol === "https:") {
      url.protocol = "wss:";
      return url.origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

const SOCKET_SOURCES = [
  DEFAULT_PUBLIC_SOCKET_URL,
  process.env["NEXT_PUBLIC_SOCKET_URL"],
].filter((source): source is string => Boolean(source));

const CONNECT_SOURCES = [
  "'self'",
  "https://api.docita.work",
  "wss://api.docita.work",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
  "https://lumberjack.razorpay.com",
  "https://*.sentry.io",
  "https://ipapi.co",
  DEFAULT_PUBLIC_API_URL,
  DEFAULT_PUBLIC_SOCKET_URL,
  ...SOCKET_SOURCES.map(toWebSocketOrigin),
  process.env["NEXT_PUBLIC_API_URL"],
  process.env["NEXT_PUBLIC_SOCKET_URL"],
  process.env["NEXT_PUBLIC_ANALYTICS_URL"],
]
  .filter((source): source is string => Boolean(source))
  .map(toOrigin);

const IMAGE_SOURCES = [
  "'self'",
  "data:",
  "blob:",
  "https:",
  process.env["NEXT_PUBLIC_API_URL"] ?? DEFAULT_PUBLIC_API_URL,
  process.env["NEXT_PUBLIC_APP_URL"] ?? DEFAULT_PUBLIC_APP_URL,
]
  .filter((source): source is string => Boolean(source))
  .map((source) => {
    if (source.endsWith(":")) {
      return source;
    }

    try {
      const url = new URL(source);
      return url.origin;
    } catch {
      return source;
    }
  });

const FRAME_SOURCES = [
  "'self'",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
];

interface CspOptions {
  /** Per-request nonce. When supplied production policy drops 'unsafe-inline'. */
  nonce?: string;
  /** Forces production semantics regardless of NODE_ENV. */
  isProduction?: boolean;
}

/**
 * Build a Content-Security-Policy string. Preferred entry point for both
 * the static `next.config.ts` headers (no nonce, dev fallback) and the
 * per-request middleware (nonce + strict).
 */
export function buildContentSecurityPolicy(options: CspOptions = {}): string {
  const isProduction =
    options.isProduction ?? process.env["NODE_ENV"] === "production";
  const nonce = options.nonce;

  const scriptSources = [
    "'self'",
    nonce ? `'nonce-${nonce}'` : undefined,
    nonce ? "'strict-dynamic'" : undefined,
    !nonce ? "'unsafe-inline'" : undefined,
    !isProduction ? "'unsafe-eval'" : undefined,
    "https://checkout.razorpay.com",
  ].filter((source): source is string => Boolean(source));

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `img-src ${Array.from(new Set(IMAGE_SOURCES)).join(" ")}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${Array.from(new Set(scriptSources)).join(" ")}`,
    `connect-src ${Array.from(new Set(CONNECT_SOURCES)).join(" ")}`,
    `frame-src ${Array.from(new Set(FRAME_SOURCES)).join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    isProduction ? "upgrade-insecure-requests" : undefined,
  ]
    .filter((directive): directive is string => Boolean(directive))
    .join("; ");
}

export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

export const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: CONTENT_SECURITY_POLICY,
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
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
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
