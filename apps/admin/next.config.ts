import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/types"],

  // ✅ OPTIMIZATION: Compression for smaller payloads
  compress: true,

  // ✅ OPTIMIZATION: Image optimization with modern formats and caching
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // ✅ OPTIMIZATION: Optimize package imports for tree-shaking
  experimental: {
    optimizePackageImports: [
      "@workspace/ui",
      "lucide-react",
      "recharts",
      "date-fns",
    ],
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
