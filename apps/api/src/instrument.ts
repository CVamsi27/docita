import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';

let nodeProfilingIntegration: (() => unknown) | undefined;
try {
  // The native profiler is optional in local/dev environments where the
  // prebuilt binding may not be available.
  ({ nodeProfilingIntegration } = require('@sentry/profiling-node'));
} catch {
  nodeProfilingIntegration = undefined;
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Sentry must initialize before NestJS modules load to instrument them properly.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  integrations: nodeProfilingIntegration
    ? ([nodeProfilingIntegration()] as any)
    : [],
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
