/**
 * Instrumentation hook for Next.js
 * Initializes Sentry for server-side error tracking
 * Called once on server startup
 */

export async function register() {
  // Only initialize on server runtime, not during builds
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const sentryConfig = await import('./lib/sentry.server.config');
      // Sentry is pre-initialized in sentry.server.config
    } catch (error) {
      // Silently fail if Sentry initialization is not available
      console.warn('Failed to initialize Sentry on server:', error);
    }
  }
}
