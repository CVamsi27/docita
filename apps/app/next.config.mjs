import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/types"],

  // Compression
  compress: true,

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
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
      "framer-motion",
      "@tanstack/react-query",
    ],
  },

  // Production source maps (disabled for smaller builds)
  productionBrowserSourceMaps: false,
};

export default withBundleAnalyzer(nextConfig);
