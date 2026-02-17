import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  // Compression for smaller payloads
  compress: true,

  // Image optimization with modern formats and caching
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
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

export default nextConfig;
