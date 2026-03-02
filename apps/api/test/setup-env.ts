import * as dotenv from 'dotenv';
import * as path from 'path';
import { ConsoleLogger, Logger } from '@nestjs/common';

dotenv.config({
  path: path.join(__dirname, '../.env.test'),
});

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
  message.includes('[AiService] OpenAI API call failed') ||
  message.includes('AuthenticationError: 401 Incorrect API key provided') ||
  message.includes('invalid_api_key') ||
  message.includes('APIConnectionError: Connection error') ||
  message.includes('[EmailService] Email provider verification failed') ||
  message.includes('Verification failed') ||
  message.includes('Connection refused');

const stringifyLogArgs = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (
        typeof arg === 'string' ||
        typeof arg === 'number' ||
        typeof arg === 'boolean'
      ) {
        return String(arg);
      }

      if (arg === null) {
        return 'null';
      }

      try {
        return JSON.stringify(arg);
      } catch {
        return '[unserializable]';
      }
    })
    .join(' ');

const originalNestLoggerError = Logger.prototype.error;
Logger.prototype.error = function (...args: unknown[]) {
  const message = stringifyLogArgs(args);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  return originalNestLoggerError.apply(this, args as never);
};

const originalNestLoggerStaticError = Logger.error;
Logger.error = (...args: Parameters<typeof Logger.error>) => {
  const message = stringifyLogArgs(args as unknown[]);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  originalNestLoggerStaticError(...args);
};

const originalConsoleLoggerError = ConsoleLogger.prototype.error;
ConsoleLogger.prototype.error = function (...args: unknown[]) {
  const message = stringifyLogArgs(args);

  if (shouldSuppressTestErrorLog(message)) {
    return;
  }

  return originalConsoleLoggerError.apply(this, args as never);
};

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
      ) {
        return String(arg);
      }

      if (arg === null) {
        return 'null';
      }

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
