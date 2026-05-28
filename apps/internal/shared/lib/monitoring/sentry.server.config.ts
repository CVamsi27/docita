import * as Sentry from "@sentry/nextjs";
import { scrubSentryEventRecord as scrubSentryEvent } from "./sentry-event-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
    beforeBreadcrumb(crumb) {
      if (!crumb) return crumb;
      return (
        scrubSentryEvent({ breadcrumbs: [crumb] }).breadcrumbs?.[0] ?? crumb
      );
    },
  });
}

export { Sentry };
