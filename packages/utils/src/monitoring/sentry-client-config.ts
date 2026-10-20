import {
  createSentryLogger,
  type SentryLoggerModule,
} from "./client-logger.js";
import {
  bootstrapSentryClient,
  createLazySentryClientLoader,
} from "./sentry-client-loader.js";
import { scrubSentryEventRecord } from "./sentry-event-scrub.js";

/**
 * Minimal structural surface of the Sentry browser SDK used by
 * `createSentryClientConfig`. Kept as a narrow interface so
 * `@workspace/utils` never depends on an `@sentry/*` package; each app's
 * `typeof import("@sentry/react")` satisfies it structurally (P5.4e).
 *
 * Method syntax (not property-function syntax) is intentional: methods are
 * checked bivariantly, which is what lets the real SDK's narrower parameter
 * types (e.g. `BrowserOptions`, `User`) satisfy the wide `object` slots.
 */
export interface SentryClientSdk extends SentryLoggerModule {
  init(options: object): unknown;
  setUser(user: object): unknown;
  setTag(key: string, value: string): unknown;
  captureException(error: unknown, options?: object): unknown;
  browserTracingIntegration(): object;
  replayIntegration(): object;
  // Widens SentryLoggerModule's narrow 3-level options so the config's
  // captureMessage can pass any SeverityLevel (method syntax = bivariant).
  captureMessage(message: string, options?: object): unknown;
}

export type SentrySeverityLevel =
  | "fatal"
  | "error"
  | "warning"
  | "log"
  | "info"
  | "debug";

const IGNORED_ERRORS: Array<string | RegExp> = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  /^Loading chunk \d+ failed/,
  /^ChunkLoadError/,
];

export interface SentryClientConfigOptions<
  TSentryModule extends SentryClientSdk,
  TContext,
> {
  /** Dynamic import of the Sentry SDK module, e.g. `() => import("@sentry/react")`. */
  importModule: () => Promise<TSentryModule>;
  /** The DSN env value gating whether Sentry is ever loaded (undefined/empty disables it). */
  dsn: string | undefined;
  /** Reads the app-specific user/admin context (e.g. from session storage). */
  getContext: () => TContext | null;
  /** Applies the resolved context to the loaded Sentry module (setUser/setTag/...). */
  applyContext: (Sentry: TSentryModule, context: TContext) => void;
}

/**
 * Builds the shared client-side Sentry setup used by `apps/app` and
 * `apps/internal`: one lazy loader, the common `Sentry.init` options
 * (tracing + replay + PHI scrubbing), `initializeSentryClient`,
 * `captureException`, `captureMessage`, and the breadcrumb logger.
 *
 * The apps differ only in *what* context they read (storage key + shape) and
 * *which* tags they set — both supplied via `getContext`/`applyContext`. The
 * DSN binding stays app-side because `VITE_SENTRY_DSN` is define-replaced per
 * app at build time.
 */
export function createSentryClientConfig<
  TSentryModule extends SentryClientSdk,
  TContext,
>({
  importModule,
  dsn,
  getContext,
  applyContext,
}: SentryClientConfigOptions<TSentryModule, TContext>) {
  const {
    isSentryEnabled,
    getLoadedSentryModule,
    loadSentryModule,
    runWithSentryModule,
  } = createLazySentryClientLoader<TSentryModule>({ importModule, dsn });

  // In-memory ready flag: initializeSentryClient is called once at bootstrap
  // (StrictMode double-mount safe) and must not re-init on HMR.
  let sentryReady = false;

  function initializeSentryClient(): void {
    if (!isSentryEnabled() || sentryReady) {
      return;
    }

    // Set the guard before the async load so repeated bootstrap calls (e.g.
    // StrictMode double-mount) cannot run Sentry.init more than once. Trade-off
    // vs. the old per-app post-load flag: a one-off dynamic-import failure now
    // disables Sentry for the session (no retry) — accepted, since main.tsx
    // calls this exactly once.
    sentryReady = true;

    bootstrapSentryClient({
      loadSentryModule,
      getContext,
      applyContext,
      initClient: (Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env["NODE_ENV"] ?? "production",
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
          ],
          tracesSampleRate: 0.1,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          sendDefaultPii: false,
          allowUrls: ["docita.work"],
          ignoreErrors: IGNORED_ERRORS,
          beforeSend: (event: unknown) => scrubSentryEventRecord(event),
          beforeSendTransaction: (event: unknown) =>
            scrubSentryEventRecord(event),
          beforeSendLog: (log: unknown) => scrubSentryEventRecord(log),
          beforeBreadcrumb: (crumb: unknown) => {
            if (!crumb) return crumb;
            return (
              scrubSentryEventRecord({ breadcrumbs: [crumb] })
                .breadcrumbs?.[0] ?? crumb
            );
          },
        });
      },
    });
  }

  function captureException(
    error: Error | string,
    context?: Record<string, unknown>,
  ): void {
    if (!isSentryEnabled()) return;

    const normalizedError =
      typeof error === "string" ? new Error(error) : error;

    try {
      const loadedModule = getLoadedSentryModule();
      if (loadedModule) {
        loadedModule.captureException(normalizedError, {
          contexts: context ? { custom: context } : undefined,
        });
        return;
      }

      void loadSentryModule().then((Sentry) => {
        if (!Sentry) return;
        Sentry.captureException(normalizedError, {
          contexts: context ? { custom: context } : undefined,
        });
      });
    } catch {
      // Monitoring calls are best-effort and must remain non-blocking.
    }
  }

  function captureMessage(
    message: string,
    level: SentrySeverityLevel = "info",
  ): void {
    if (!isSentryEnabled()) return;

    try {
      runWithSentryModule((Sentry) => {
        Sentry.captureMessage(message, { level });
      });
    } catch {
      // Monitoring calls are best-effort and must remain non-blocking.
    }
  }

  const logger = createSentryLogger<TSentryModule>({ importModule, dsn });

  return { initializeSentryClient, captureException, captureMessage, logger };
}
