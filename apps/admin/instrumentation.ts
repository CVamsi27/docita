/**
 * Instrumentation hook for Next.js (Admin App)
 * Initializes Sentry for server-side error tracking
 * Called once on server startup
 */

export async function register() {
  // Only initialize on server runtime, not during builds
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // Import for side effects - Sentry initialization in sentry.server.config
      await import('./lib/sentry.server.config');
    } catch (error) {
      // Silently fail if Sentry initialization is not available
      console.warn('Failed to initialize Sentry on server:', error);
    }
  }
}
