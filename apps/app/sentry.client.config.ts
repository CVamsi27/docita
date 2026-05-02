import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./lib/sentry-phi-redactor";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0,
  sendDefaultPii: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    /^Loading chunk \d+ failed/,
    /^ChunkLoadError/,
  ],
  beforeSend(event) {
    return scrubSentryEvent(event);
  },
  beforeBreadcrumb(crumb) {
    if (!crumb) return crumb;
    return scrubSentryEvent({ breadcrumbs: [crumb] }).breadcrumbs?.[0] ?? crumb;
  },
});
