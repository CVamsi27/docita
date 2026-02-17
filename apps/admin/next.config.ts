import type { NextConfig } from "next";
import { createRequire } from "module";
import { withSentryConfig } from "@sentry/nextjs";

const require = createRequire(import.meta.url);

let nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/types"],

  // Compression for smaller payloads
  compress: true,

  // Image optimization with modern formats and caching
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Optimize package imports for tree-shaking
  experimental: {
    optimizePackageImports: [
      "@workspace/ui",
      "lucide-react",
      "recharts",
      "date-fns",
    ],
  },

  // Disable production source maps for smaller bundle size
  productionBrowserSourceMaps: false,

  // Empty turbopack config to satisfy Next.js 16 requirement
  turbopack: {},

  // Webpack config for bundle analyzer and warning suppression
  webpack: (config, { isServer }) => {
    // Suppress OpenTelemetry/Sentry critical dependency warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
    ];

    // Bundle analyzer (only in production with ANALYZE=true)
    if (process.env.ANALYZE === "true" && !isServer) {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          reportFilename: "./analyze.html",
          openAnalyzer: true,
        }),
      );
    }

    return config;
  },
};

// Add Sentry error tracking for admin app
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  nextConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG || "docita",
    project: process.env.SENTRY_PROJECT || "admin",
    silent: true,
  });
}

export default nextConfig;
