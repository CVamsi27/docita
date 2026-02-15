import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '@nestjs/common';

// Load test environment variables
dotenv.config({
  path: path.join(__dirname, '../.env.test'),
});

// Silence Nest logger output during tests; assertions still validate behavior.
Logger.overrideLogger(false);

// Suppress console errors during tests (they're expected/handled)
const originalError = console.error;
console.error = (...args: Array<string | number | boolean | Record<string, unknown> | null>) => {
  // Suppress expected negative-path logs so test output highlights real failures.
  const message = args.map((arg) => String(arg)).join(' ');
  if (
    message.includes('[ExceptionsHandler]') ||
    message.includes('PrismaClientKnownRequestError') ||
    message.includes(
      'Login error: UnauthorizedException: Invalid credentials',
    ) ||
    message.includes('[OnboardingService] Onboarding failed:') ||
    message.includes('[InvoiceEventsListener] Failed to create payment link') ||
    message.includes('[MetricsService] Failed to record metric') ||
    message.includes('[AiService] OpenAI API call failed') ||
    message.includes('APIConnectionError: Connection error')
  ) {
    return;
  }
  originalError(...args);
};
