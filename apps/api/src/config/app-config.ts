/**
 * Backend Application Configuration
 *
 * Centralizes all configuration values that were previously hardcoded.
 * Uses environment variables with sensible defaults for development.
 */

/**
 * Get CORS origins from environment or use defaults
 */
export function getCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map((origin) => origin.trim());
  }

  // Default development origins
  return [
    'https://landing.docita.work',
    'https://app.docita.work',
    'https://admin.docita.work',
    'http://localhost:3003', // landing dev
    'http://localhost:3000', // app dev
    'http://localhost:3002', // admin dev
  ];
}

/**
 * Get WebSocket CORS origins
 */
export function getWebSocketCorsOrigins(): string[] {
  return getCorsOrigins();
}

/**
 * Get app URL for callbacks
 */
export function getAppUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

/**
 * Get payment callback URL
 */
export function getPaymentCallbackUrl(): string {
  return `${getAppUrl()}/api/payment/callback`;
}

/**
 * Get frontend app URL for redirects
 */
export function getFrontendAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Get environment name
 */
export function getEnvironment(): 'development' | 'staging' | 'production' {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Configuration object
 */
export const CONFIG = {
  // Application
  APP_URL: getAppUrl(),
  FRONTEND_APP_URL: getFrontendAppUrl(),
  ENVIRONMENT: getEnvironment(),

  // CORS
  CORS_ORIGINS: getCorsOrigins(),
  CORS_CREDENTIALS: true,
  CORS_METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  CORS_ALLOWED_HEADERS: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],

  // Payment
  PAYMENT_CALLBACK_URL: getPaymentCallbackUrl(),

  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;

export default {
  getCorsOrigins,
  getWebSocketCorsOrigins,
  getAppUrl,
  getPaymentCallbackUrl,
  getFrontendAppUrl,
  getEnvironment,
  isProduction,
  isDevelopment,
  CONFIG,
};
