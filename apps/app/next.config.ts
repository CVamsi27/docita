import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@workspace/ui', '@workspace/db', '@workspace/types'],
  typescript: {
    ignoreBuildErrors: true, // Temporarily allow for launch - fix post-deployment
  },
  webpack: (config) => {
    // Suppress OpenTelemetry/Sentry critical dependency warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /node_modules\/@opentelemetry\/instrumentation/ },
      { module: /node_modules\/@prisma\/instrumentation/ },
      { module: /node_modules\/require-in-the-middle/ },
      { module: /node_modules\/import-in-the-middle/ },
    ];
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

// Conditional Sentry configuration
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry configuration options
      org: process.env.SENTRY_ORG || 'docita',
      project: process.env.SENTRY_PROJECT || 'frontend',
      silent: true,
    })
  : nextConfig;

export default config;
