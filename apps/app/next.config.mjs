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

  // Bundle analyzer (only in production with ANALYZE=true)
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  ...(process.env.ANALYZE === "true" && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        // eslint-disable-next-line turbo/no-undeclared-env-vars, @typescript-eslint/no-require-imports, no-undef
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
