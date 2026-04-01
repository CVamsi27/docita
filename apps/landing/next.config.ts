import type { NextConfig } from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const isCloudflareBuild = process.env.DOCITA_CLOUDFLARE === "1";
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:3001";

const nextConfig: NextConfig = {
  compress: !isCloudflareBuild,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, 
  },

  productionBrowserSourceMaps: false,

  turbopack: {},

  webpack: (config, { isServer }) => {

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
    ];

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

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
