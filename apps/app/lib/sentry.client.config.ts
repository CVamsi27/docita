/**
 * Client-side Sentry configuration
 * Initializes Sentry context and error handling
 * Sentry is already initialized by withSentryConfig in next.config.ts
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Initialize Sentry context on the client
 * Call this from a useEffect in your root layout
 * Note: Sentry itself is already initialized by withSentryConfig
 */
export function initializeSentryClient() {
  if (!SENTRY_DSN || isDev) {
    return;
  }

  try {

    // Set user context if available from auth
    const userInfo = getUserContextFromStorage();
    if (userInfo) {
      Sentry.setUser({
        id: userInfo.userId,
        email: userInfo.email,
        username: userInfo.role,
      });
      // Add clinic context for tenant isolation debugging
      Sentry.setTag('clinic_id', userInfo.clinicId);
      Sentry.setTag('role', userInfo.role);
    }

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(
        new Error(
          `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`
        )
      );
    });

    // Mark that Sentry is ready
    (window as unknown as Record<string, unknown>).__sentryReady = true;
  } catch (error) {
    console.error('Failed to initialize Sentry on client:', error);
  }
}

/**
 * Extract user context from authentication storage
 * Matches the auth context structure from apps/app
 */
function getUserContextFromStorage(): {
  userId: string;
  clinicId: string;
  email: string;
  role: string;
} | null {
  try {
    // Try to get from sessionStorage (set by auth context)
    const userStr = sessionStorage.getItem('docita_user_context');
    if (userStr) {
      return JSON.parse(userStr);
    }

    // Fallback: try to extract from auth token headers
    // The HttpOnly cookie is not accessible here, but we can try other methods
    return null;
  } catch (error) {
    console.error('Failed to get user context for Sentry:', error);
    return null;
  }
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | string,
  context?: Record<string, unknown>
) {
  if (isDev) {
    console.error('Sentry error (dev mode):', error, context);
    return;
  }

  try {
    Sentry.captureException(typeof error === 'string' ? new Error(error) : error, {
      contexts: context ? { custom: context } : undefined,
    });
  } catch (err) {
    console.error('Failed to capture exception in Sentry:', err);
  }
}

/**
 * Capture a message (non-error) event
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (isDev) {
    console.log(`Sentry message [${level}] (dev mode):`, message);
    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (err) {
    console.error('Failed to capture message in Sentry:', err);
  }
}

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = 'user-action'
) {
  try {
    Sentry.addBreadcrumb({
      message,
      level: 'info',
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    console.error('Failed to add breadcrumb to Sentry:', err);
  }
}

export { Sentry };
