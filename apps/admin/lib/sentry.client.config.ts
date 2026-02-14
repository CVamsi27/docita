/**
 * Client-side Sentry configuration for Admin App
 * Initializes Sentry context and error handling
 * Sentry is already initialized by withSentryConfig in next.config.ts
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === 'development';

/**
 * Initialize Sentry context on the client
 */
export function initializeSentryClient() {
  if (!SENTRY_DSN || isDev) {
    return;
  }

  try {

    // Set admin context
    const adminInfo = getAdminContextFromStorage();
    if (adminInfo) {
      Sentry.setUser({
        id: adminInfo.adminId,
        email: adminInfo.email,
        username: adminInfo.role,
      });
      Sentry.setTag('role', adminInfo.role);
      Sentry.setTag('app', 'admin');
    }

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      Sentry.captureException(
        new Error(
          `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`
        )
      );
    });
  } catch (error) {
    console.error('Failed to initialize Sentry on client:', error);
  }
}

/**
 * Extract admin context from storage
 */
function getAdminContextFromStorage(): {
  adminId: string;
  email: string;
  role: string;
} | null {
  try {
    const adminStr = sessionStorage.getItem('docita_admin_context');
    if (adminStr) {
      return JSON.parse(adminStr);
    }
    return null;
  } catch (error) {
    console.error('Failed to get admin context for Sentry:', error);
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
 * Capture a message event
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
 * Add a breadcrumb for tracking admin actions
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = 'admin-action'
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
