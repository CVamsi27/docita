import * as dotenv from 'dotenv';
import * as path from 'path';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { validateEnv } from '../src/shared/modules/config/app-config';

dotenv.config({
  path: path.join(__dirname, '../.env.test'),
});

process.env.DATABASE_URL ??=
  'postgresql://docita:docita@localhost:5434/docita_test';

// Abort if tests are about to run against a production-looking database.
// Reason: tests truncate/seed shared tables; a misconfigured env that points
// at prod RDS would corrupt real PHI.
const dbUrl = process.env.DATABASE_URL ?? '';
const isProdLikeHost =
  /\brds\.amazonaws\.com\b/i.test(dbUrl) ||
  /\bdocita-prod\b/i.test(dbUrl) ||
  /[?&]application_name=prod/i.test(dbUrl);
if (process.env.NODE_ENV === 'production' || isProdLikeHost)
  throw new Error(
    'Refusing to run tests with NODE_ENV=production or against a prod-looking DATABASE_URL. ' +
      'Tests must use apps/api/.env.test.',
  );

validateEnv();

Logger.overrideLogger(false);

const shouldSuppressTestErrorLog = (message: string): boolean =>
  message.includes('[ExceptionsHandler]') ||
  message.includes('PrismaClientKnownRequestError') ||
  message.includes('Login error: UnauthorizedException: Invalid credentials') ||
  message.includes('[AuthController] Login error:') ||
  message.includes('UnauthorizedException: Invalid credentials') ||
  message.includes('[OnboardingService] Onboarding failed:') ||
  message.includes('[InvoiceEventsListener] Failed to create payment link') ||
  message.includes('[MetricsService] Failed to record metric') ||
  message.includes('[MetricsService] Error: DB Error') ||
  message.includes('AuthenticationError: 401 Incorrect API key provided') ||
  message.includes('invalid_api_key') ||
  message.includes('APIConnectionError: Connection error') ||
  message.includes('[EmailService] Email provider verification failed') ||
  message.includes('Verification failed') ||
  message.includes('Connection refused');

const stringifyLogArgs = (args: readonly unknown[]): string =>
  args
    .map((arg) => {
      if (
        typeof arg === 'string' ||
        typeof arg === 'number' ||
        typeof arg === 'boolean'
      )
        return String(arg);

      if (arg === null) return 'null';

      try {
        return JSON.stringify(arg);
      } catch {
        return '[unserializable]';
      }
    })
    .join(' ');

const originalNestLoggerError = Logger.prototype.error;
type NestLoggerErrorArgs = Parameters<Logger['error']>;
Logger.prototype.error = function (...args: NestLoggerErrorArgs) {
  const message = stringifyLogArgs(args);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  return originalNestLoggerError.call(this, ...args);
};

const originalNestLoggerStaticError = Logger.error;
Logger.error = (...args: Parameters<typeof Logger.error>) => {
  const message = stringifyLogArgs(args);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  originalNestLoggerStaticError(...args);
};

const originalConsoleLoggerError = ConsoleLogger.prototype.error;
type ConsoleLoggerErrorArgs = Parameters<ConsoleLogger['error']>;
ConsoleLogger.prototype.error = function (...args: ConsoleLoggerErrorArgs) {
  const message = stringifyLogArgs(args);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  return originalConsoleLoggerError.call(this, ...args);
};

if (!global.fetch) {
  global.fetch = async () =>
    new Response('{}', {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
}

const originalError = console.error;
console.error = (
  ...args: Array<string | number | boolean | Record<string, unknown> | null>
) => {
  const message = args
    .map((arg) => {
      if (
        typeof arg === 'string' ||
        typeof arg === 'number' ||
        typeof arg === 'boolean'
      )
        return String(arg);

      if (arg === null) return 'null';

      try {
        return JSON.stringify(arg);
      } catch {
        return '[unserializable]';
      }
    })
    .join(' ');
  if (shouldSuppressTestErrorLog(message)) {
    return;
  }
  originalError(...args);
};
