/**
 * Server-side Sentry configuration
 * Note: Sentry for Next.js is primarily initialized via next.config.ts withSentryConfig
 * This file provides additional server-side context setup
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === 'development';

// Server-side initialization happens automatically with withSentryConfig
// This is just for reference and additional setup if needed

export { Sentry };
