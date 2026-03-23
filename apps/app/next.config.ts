import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},

  compress: true,

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
    ],
  },

  productionBrowserSourceMaps: false,

  webpack: (config, { isServer, webpack }) => {

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/import-in-the-middle/ },
    ];

    if (isServer) {
      // @sentry/node auto-instruments ~20 frameworks via @opentelemetry/instrumentation-*
      // packages (Koa, GraphQL, Redis, etc.). These pull in the actual framework code —
      // that's the ~9MB of dead weight in the server bundle. They cannot run in Cloudflare
      // Workers anyway (Node.js-only APIs). NormalModuleReplacementPlugin swaps every
      // matching request with an empty CJS stub at bundle time, so none of the OTel
      // instrumentation or framework code is included. Sentry error capturing is
      // unaffected — it doesn't rely on OTel.
      const STUB = path.resolve(process.cwd(), "lib/stubs/empty-module.cjs");
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
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

let config: NextConfig = withBundleAnalyzer(nextConfig);

config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG || "docita",
      project: process.env.SENTRY_PROJECT || "frontend",
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
