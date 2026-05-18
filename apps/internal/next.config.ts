import type { NextConfig } from "next";
import { createRequire } from "module";
import { withSentryConfig } from "@sentry/nextjs";

const require = createRequire(import.meta.url);
const nextCloudflareEmptyStub =
  require.resolve("@workspace/ui/next-cloudflare/empty-module.cjs");
const nextCloudflareSentryStub =
  require.resolve("@workspace/ui/next-cloudflare/sentry-nextjs-cloudflare");
const isCloudflareBuild = process.env.DOCITA_CLOUDFLARE === "1";
const DEFAULT_PUBLIC_API_URL = isCloudflareBuild
  ? "/api/v1"
  : "http://127.0.0.1:3001/api/v1";

let nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/types"],

  compress: !isCloudflareBuild,
  env: {
    NEXT_PUBLIC_API_URL: isCloudflareBuild
      ? DEFAULT_PUBLIC_API_URL
      : (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC_API_URL),
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  experimental: {
    optimizePackageImports: ["@workspace/ui", "lucide-react", "recharts"],
  },

  productionBrowserSourceMaps: false,

  turbopack: {},

  webpack: (config, { isServer, webpack }) => {
    if (isCloudflareBuild) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@sentry/nextjs$": nextCloudflareSentryStub,
      };
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/import-in-the-middle/ },
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

    if (isServer && isCloudflareBuild) {
      const STUB = nextCloudflareEmptyStub;
      const otelPatterns = [
        /^@opentelemetry\/instrumentation/,
        /^@sentry\/opentelemetry/,
        /^import-in-the-middle/,
        /^require-in-the-middle/,
      ];
      for (const pattern of otelPatterns) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(pattern, STUB),
        );
      }
    }

    return config;
  },
};

if (process.env.NEXT_PUBLIC_SENTRY_DSN && !isCloudflareBuild) {
  nextConfig = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG || "docita",
    project: process.env.SENTRY_PROJECT || "internal",
    silent: true,
  });
}

export default nextConfig;
