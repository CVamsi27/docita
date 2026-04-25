import { createRequire } from "module";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const require = createRequire(import.meta.url);
const nextCloudflareEmptyStub = require.resolve(
  "@workspace/ui/next-cloudflare/empty-module.cjs",
);
const nextCloudflareSentryStub = require.resolve(
  "@workspace/ui/next-cloudflare/sentry-nextjs-cloudflare",
);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isCloudflareBuild = process.env.DOCITA_CLOUDFLARE === "1";
const DEFAULT_PUBLIC_API_URL = isCloudflareBuild
  ? "https://api.docita.work/api/v1"
  : "http://localhost:3001/api/v1";
const DEFAULT_PUBLIC_APP_URL = isCloudflareBuild
  ? "https://app.docita.work"
  : "http://localhost:3000";
const DEFAULT_PUBLIC_SOCKET_URL = isCloudflareBuild
  ? "https://api.docita.work"
  : "http://localhost:3001";

function resolveApiProxyTarget(): string {
  if (process.env.API_PROXY_TARGET) return process.env.API_PROXY_TARGET;
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL).origin;
    } catch {
      // fall through
    }
  }
  if (process.env.DOCITA_CLOUDFLARE === "1") {
    return "https://api.docita.work";
  }
  return "http://localhost:3001";
}

const API_PROXY_TARGET = resolveApiProxyTarget();
const CONNECT_SOURCES = [
  "'self'",
  "https://api.docita.work",
  "wss://api.docita.work",
  "https://*.sentry.io",
  process.env.NEXT_PUBLIC_API_URL,
  process.env.NEXT_PUBLIC_SOCKET_URL,
  process.env.NEXT_PUBLIC_ANALYTICS_URL,
]
  .filter((source): source is string => Boolean(source))
  .map((source) => {
    try {
      const url = new URL(source);
      return url.origin;
    } catch {
      return source;
    }
  });

const IMAGE_SOURCES = [
  "'self'",
  "data:",
  "blob:",
  "https:",
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC_API_URL,
  process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PUBLIC_APP_URL,
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
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `img-src ${Array.from(new Set(IMAGE_SOURCES)).join(" ")}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  `connect-src ${Array.from(new Set(CONNECT_SOURCES)).join(" ")}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},

  allowedDevOrigins: ["127.0.0.1", "localhost"],

  compress: !isCloudflareBuild,
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL ?? DEFAULT_PUBLIC_SOCKET_URL,
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, 
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@tanstack/react-query",
      "@workspace/ui",
      "@workspace/hooks",
      "@workspace/utils"
    ],
  },

  productionBrowserSourceMaps: false,

  webpack: (config, { isServer, webpack }) => {
    if (isCloudflareBuild) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@sentry/nextjs$": nextCloudflareSentryStub,
      };
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/import-in-the-middle/ },
    ];

    if (isServer) {
      const STUB = nextCloudflareEmptyStub;
      const otelPatterns = [
        /^@opentelemetry\/instrumentation/,
        /^@sentry\/opentelemetry/,
        /^import-in-the-middle/,
        /^require-in-the-middle/,
      ];
      for (const pattern of otelPatterns) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(pattern, STUB),
        );
      }
    }

    return config;
  },

  async rewrites() {
    const rewrites = [
      {
        source: "/branding/docita-icon-round.png",
        destination: "/branding/Round_Logo.png",
      },
      {
        source: "/branding/docita-logo-master.jpg",
        destination: "/branding/Dark-background.png",
      },
    ];

    if (!isCloudflareBuild) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      });
    }

    return rewrites;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
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
            value:
              "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
        ],
      },
    ];
  },
};

let config: NextConfig = withBundleAnalyzer(nextConfig);

config = process.env.NEXT_PUBLIC_SENTRY_DSN && !isCloudflareBuild
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG || "docita",
      project: process.env.NEXT_PUBLIC_SENTRY_PROJECT || "javascript-nextjs",
      silent: true,
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
        excludeReplayWorker: true,
      },
    })
  : config;

export default config;
