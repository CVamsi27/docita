import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Sentry must initialize before NestJS modules load to instrument them properly.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  integrations: [nodeProfilingIntegration()],
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
