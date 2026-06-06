import { createRequire } from "module";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";
const require = createRequire(import.meta.url);
const nextCloudflareEmptyStub = require.resolve(
  "./scripts/deploy/cloudflare-stubs/empty-module.cjs",
);
const nextCloudflareSentryStub = require.resolve(
  "./scripts/deploy/cloudflare-stubs/sentry-nextjs-cloudflare.ts",
);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isCloudflareBuild = process.env.DOCITA_CLOUDFLARE === "1";
const DEFAULT_PUBLIC_API_URL = "/api/v1";
const DEFAULT_PUBLIC_APP_URL = isCloudflareBuild
  ? "https://app.docita.work"
  : "http://localhost:3000";
const DEFAULT_PUBLIC_SOCKET_URL = isCloudflareBuild
  ? "https://api.docita.work"
  : "http://localhost:3001";

function parseUrlOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveApiProxyTarget(): string {
  if (process.env.API_PROXY_TARGET) return process.env.API_PROXY_TARGET;
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = parseUrlOrigin(process.env.NEXT_PUBLIC_API_URL);
    if (origin) return origin;
  }
  if (process.env.DOCITA_CLOUDFLARE === "1") return "https://api.docita.work";
  return "http://localhost:3001";
}

const API_PROXY_TARGET = resolveApiProxyTarget();
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
      "@tanstack/react-query",
      "@workspace/ui",
      "@workspace/hooks",
      "@workspace/utils",
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

      if (isCloudflareBuild) {
        const clientOnlyPatterns = [
          /^leaflet$/,
          /^react-leaflet$/,
          /^@react-google-maps\/api$/,
          /^canvas-confetti$/,
          /^cmdk$/,
          /^socket\.io-client(\/|$)/,
          /^@sentry\/node(\/|$)/,
          /^@sentry\/profiling-node(\/|$)/,
          /^@sentry-internal\//,
        ];
        for (const pattern of clientOnlyPatterns) {
          config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(pattern, STUB),
          );
        }
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
