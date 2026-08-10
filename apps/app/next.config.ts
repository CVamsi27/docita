import { createRequire } from "module";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const require = createRequire(import.meta.url);
const nextCloudflareEmptyStub = require.resolve(
  "./scripts/deploy/cloudflare-stubs/empty-module.cjs",
);
const nextCloudflareSentryStub = require.resolve(
  "./scripts/deploy/cloudflare-stubs/sentry-nextjs-cloudflare.ts",
);

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isCloudflareBuild = process.env.DOCITA_CLOUDFLARE === "1";
const DEFAULT_PUBLIC_API_URL = "/api/v1";
const DEFAULT_PUBLIC_APP_URL = isCloudflareBuild
  ? "https://app.docita.work"
  : "http://localhost:3000";
const DEFAULT_PUBLIC_SOCKET_URL = isCloudflareBuild
  ? "https://api.docita.work"
  : "http://localhost:3001";

function parseUrlOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveApiProxyTarget(): string {
  if (process.env.API_PROXY_TARGET) return process.env.API_PROXY_TARGET;
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = parseUrlOrigin(process.env.NEXT_PUBLIC_API_URL);
    if (origin) return origin;
  }
  if (process.env.DOCITA_CLOUDFLARE === "1") return "https://api.docita.work";
  return "http://localhost:3001";
}

const API_PROXY_TARGET = resolveApiProxyTarget();
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},

  allowedDevOrigins: ["127.0.0.1", "localhost"],

  compress: !isCloudflareBuild,
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL ?? DEFAULT_PUBLIC_SOCKET_URL,
  },

  compiler: {
    removeConsole:
// jscpd:ignore-start
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
// jscpd:ignore-end
      "recharts",
      "@tanstack/react-query",
      "@workspace/ui",
      "@workspace/hooks",
      "@workspace/utils",
    ],
  },

// jscpd:ignore-start
  productionBrowserSourceMaps: false,

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

    if (isServer) {
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

      if (isCloudflareBuild) {
// jscpd:ignore-end
        const clientOnlyPatterns = [
          /^leaflet$/,
          /^react-leaflet$/,
          /^@react-google-maps\/api$/,
          /^canvas-confetti$/,
          /^cmdk$/,
          /^socket\.io-client(\/|$)/,
          /^@sentry\/node(\/|$)/,
          /^@sentry\/profiling-node(\/|$)/,
          /^@sentry-internal\//,
          /^react-signature-canvas$/,
          /^qrcode\.react$/,
          /^sonner$/,
          /^web-vitals$/,
        ];
        for (const pattern of clientOnlyPatterns) {
          config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(pattern, STUB),
          );
        }

        // Swap the i18n request config for a Cloudflare-optimized version
        // that only loads English messages (saves ~150 KB Hindi messages bundle).
        // The previous version passed a function as the resourceRegExp, which
        // webpack treats as the *replacer* and calls .test() on the return value,
        // breaking the resolve chain with "I.test is not a function". Use a RegExp
        // matcher and pass the replacement path as the second arg (the correct API).
        const i18nRequestCloudflare = require.resolve(
          "./i18n/request.cloudflare.ts",
        );
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(
            /\/i18n\/request\.ts$/,
            i18nRequestCloudflare,
          ),
        );
      }
    }

    return config;
  },

  async rewrites() {
    const rewrites = [
      {
        source: "/branding/docita-icon-round.png",
        destination: "/branding/Round_Logo.png",
      },
      {
        source: "/branding/docita-logo-master.jpg",
        destination: "/branding/Dark-background.png",
      },
    ];

    if (!isCloudflareBuild) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      });
    }

    return rewrites;
  },

};

// next-intl v4 requires its plugin to register the request config for the
// standard (non-Cloudflare) build path — without it, every server render
// throws "Couldn't find next-intl config file". It must wrap the Sentry
// plugin (Sentry's webpack pass otherwise swallows the next-intl plugin);
// Sentry is skipped entirely on Cloudflare builds. The webpack
// NormalModuleReplacementPlugin below still swaps `i18n/request.ts` for the
// Cloudflare-optimized variant during DOCITA_CLOUDFLARE=1 builds, so the
// production worker path is unchanged.
let config: NextConfig = withNextIntl(withBundleAnalyzer(nextConfig));

config = process.env.NEXT_PUBLIC_SENTRY_DSN && !isCloudflareBuild
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG || "docita",
      project: process.env.NEXT_PUBLIC_SENTRY_PROJECT || "javascript-nextjs",
      silent: true,
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
        excludeReplayWorker: true,
      },
    })
  : config;

export default config;
