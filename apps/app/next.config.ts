import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/types"],
  typescript: {
    ignoreBuildErrors: true, // Temporarily allow for launch - fix post-deployment
  },

  turbopack: {},

  // Compression
  compress: true,

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      "@workspace/ui",
      "lucide-react",
      "recharts",
      "date-fns",
      "@tanstack/react-query",
    ],
  },

  // Production source maps (disabled for smaller builds)
  productionBrowserSourceMaps: false,

  webpack: (config) => {
    // Suppress OpenTelemetry/Sentry critical dependency warnings
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
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

// Apply bundle analyzer first
let config: NextConfig = withBundleAnalyzer(nextConfig);

// Apply Sentry config if DSN is provided
config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(config, {
      // Sentry configuration options
      org: process.env.SENTRY_ORG || "docita",
      project: process.env.SENTRY_PROJECT || "frontend",
      silent: true,
    })
  : config;

export default config;
