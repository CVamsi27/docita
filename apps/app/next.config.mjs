/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/types"],

  // Compression
  compress: true,

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
    ],
  },

  // Production source maps (disabled for smaller builds)
  productionBrowserSourceMaps: false,

  // Bundle analyzer disabled in favor of Next.js built-in analysis
  // To enable: install @next/bundle-analyzer and use with ANALYZE=true environment variable
};

export default nextConfig;
