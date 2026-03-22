import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/types"],
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
      "@workspace/ui",
      "lucide-react",
      "recharts",
      "date-fns",
      "@tanstack/react-query",
    ],
  },

  productionBrowserSourceMaps: false,

  webpack: (config) => {

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/import-in-the-middle/ },
    ];
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
    })
  : config;

export default config;
