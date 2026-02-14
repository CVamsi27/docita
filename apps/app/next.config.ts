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
      // Authentication note: Requires Sentry token setup in environment

      // Sets the environment to development when running locally
      environment: process.env.NODE_ENV,

      // Disable all console integrations in production
      _experiments: {
        captureCheckIn: true,
      },

      // Ignore certain errors that are expected or not actionable
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',

        // Network errors
        'NetworkError when attempting to fetch resource',
        'Failed to fetch',
        'fetch is not defined',

        // ResizeObserver - typically non-critical
        'ResizeObserver loop limit exceeded',

        // Cross-origin errors
        'Script error',
        'Non-Error promise rejection captured',

        // Known non-critical errors
        'Unexpected token < in JSON at position',
      ],
    })
  : nextConfig;

export default config;
