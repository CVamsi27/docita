import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
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
