import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
  // Session replay only in production to avoid noise
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  sendDefaultPii: false,
  // Ignore common non-actionable browser errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Loading chunk \d+ failed/,
    /^ChunkLoadError/,
  ],
  beforeSend(event) {
    // Strip any PII that may have leaked into breadcrumbs or request data
    if (event.request?.data) {
      const sensitiveKeys = ["password", "token", "secret", "ssn", "dob"];
      const data = event.request.data as Record<string, unknown>;
      for (const key of sensitiveKeys) {
        if (key in data) {
          data[key] = "[Filtered]";
        }
      }
    }
    return event;
  },
});
