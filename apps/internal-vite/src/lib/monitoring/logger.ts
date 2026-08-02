import { createSentryLogger } from "@workspace/utils";

type SentryModule = typeof import("@sentry/react");

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;

export const logger = createSentryLogger<SentryModule>({
  importModule: () => import("@sentry/react"),
  dsn: SENTRY_DSN,
});
