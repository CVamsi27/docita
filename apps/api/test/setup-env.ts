import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({
  path: path.join(__dirname, '../.env.test'),
});

// Suppress console errors during tests (they're expected/handled)
const originalError = console.error;
console.error = (...args: any[]) => {
  // Only suppress Nest errors that are intentionally tested
  const message = args[0]?.toString() || '';
  if (message.includes('[ExceptionsHandler]') || message.includes('PrismaClientKnownRequestError')) {
    return;
  }
  originalError(...args);
};

