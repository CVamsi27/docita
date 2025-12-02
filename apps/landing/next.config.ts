import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  // ✅ OPTIMIZATION: Compression for smaller payloads
  compress: true,

  // ✅ OPTIMIZATION: Image optimization with modern formats and caching
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // ✅ OPTIMIZATION: Disable production source maps for smaller bundle size
  productionBrowserSourceMaps: false,

  // ✅ OPTIMIZATION: Bundle analyzer (only in production with ANALYZE=true)
  ...(process.env.ANALYZE === "true" && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
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
  }),
};

export default nextConfig;
