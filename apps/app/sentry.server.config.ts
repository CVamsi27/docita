import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "./shared/lib/monitoring/sentry-phi-redactor";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  beforeSend(event) {
    return scrubSentryEvent(event);
  },
  beforeBreadcrumb(crumb) {
    if (!crumb) return crumb;
    return scrubSentryEvent({ breadcrumbs: [crumb] }).breadcrumbs?.[0] ?? crumb;
  },
});
