import * as dotenv from 'dotenv';
import * as path from 'path';
import * as Sentry from '@sentry/nestjs';
import type { NodeOptions } from '@sentry/nestjs';
import { createSentryBeforeSend } from '@/shared/modules/error-handling/sentry.utils';

type SentryIntegration =
  NonNullable<NodeOptions['integrations']> extends Array<infer T> ? T : never;

let nodeProfilingIntegration: (() => SentryIntegration) | undefined;
// Profiling uses native pprof bindings that crash on Alpine Linux (musl libc).
// Disabled by default in production; enable by setting SENTRY_PROFILING=true.
const profilingEnabled = process.env.SENTRY_PROFILING === 'true';
if (profilingEnabled) {
  try {
    ({ nodeProfilingIntegration } = require('@sentry/profiling-node'));
  } catch {
    nodeProfilingIntegration = undefined;
  }
}

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  beforeSend: createSentryBeforeSend(),
  integrations: nodeProfilingIntegration
    ? [
        nodeProfilingIntegration(),
        Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
      ]
    : [Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] })],
  enableLogs: true,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  profilesSampleRate: profilingEnabled
    ? Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? '0.1')
    : 0,
  maxBreadcrumbs: 50,
  attachStacktrace: true,
  sendDefaultPii: false,
  initialScope: {
    tags: {
      service: 'docita-api',
    },
  },
});
