import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';
import type { NodeOptions } from '@sentry/nestjs';

type SentryIntegration =
  NonNullable<NodeOptions['integrations']> extends Array<infer T> ? T : never;

let nodeProfilingIntegration: (() => SentryIntegration) | undefined;
try {
  ({ nodeProfilingIntegration } = require('@sentry/profiling-node'));
} catch {
  nodeProfilingIntegration = undefined;
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  integrations: nodeProfilingIntegration ? [nodeProfilingIntegration()] : [],
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  profilesSampleRate:
    process.env.NODE_ENV === 'production'
      ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1')
      : 1.0,
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  sendDefaultPii: false,
  initialScope: {
    tags: {
      service: 'docita-api',
    },
  },
});
