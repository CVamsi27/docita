import { createLazySentryClientLoader } from "./sentry-client-loader.js";

export type ClientLogLevel = "info" | "warn" | "error";

/** Minimal shape of the Sentry SDK methods the client logger relies on. */
export interface SentryLoggerModule {
  addBreadcrumb: (breadcrumb: {
    category?: string;
    level?: "info" | "warning" | "error";
    message?: string;
    data?: Record<string, unknown>;
  }) => unknown;
  captureMessage: (
    message: string,
    options?: {
      level?: "info" | "warning" | "error";
      extra?: Record<string, unknown>;
    },
  ) => unknown;
}

export interface SentryLoggerOptions<
  TSentryModule extends SentryLoggerModule,
> {
  /** Dynamic import of the Sentry SDK module, e.g. `() => import("@sentry/react")`. */
  importModule: () => Promise<TSentryModule>;
  /** The DSN env value gating whether Sentry is ever loaded (undefined/empty disables it). */
  dsn: string | undefined;
}

const SENTRY_LEVEL: Record<ClientLogLevel, "info" | "warning" | "error"> = {
  info: "info",
  warn: "warning",
  error: "error",
};

function isPlainRecord(
  context: unknown,
): context is Record<string, unknown> {
  return (
    typeof context === "object" &&
    context !== null &&
    !Array.isArray(context)
  );
}

function toRecord(context: unknown): Record<string, unknown> | undefined {
  if (context === undefined) return undefined;
  if (isPlainRecord(context)) return context;
  return { value: context };
}

/**
 * Builds the shared client logger used by `apps/app-vite` and
 * `apps/internal-vite`. Records breadcrumbs for every level and captures
 * warn/error messages through the lazily-loaded Sentry SDK; every call is
 * best-effort and never throws into callers.
 *
 * Generic over the SDK module type so `@workspace/utils` stays free of an
 * `@sentry/*` dependency — each app supplies its own
 * `typeof import("@sentry/react")` via the type parameter.
 */
export function createSentryLogger<
  TSentryModule extends SentryLoggerModule,
>({ importModule, dsn }: SentryLoggerOptions<TSentryModule>) {
  const { runWithSentryModule } = createLazySentryClientLoader<TSentryModule>({
    importModule,
    dsn,
  });

  function recordClientLog(
    level: ClientLogLevel,
    message: string,
    context?: unknown,
  ) {
    const data = toRecord(context);

    runWithSentryModule((Sentry) => {
      try {
        Sentry.addBreadcrumb({
          category: "logger",
          level: SENTRY_LEVEL[level],
          message,
          ...(data !== undefined ? { data } : {}),
        });
      } catch {
        // Breadcrumb recording is best-effort.
      }

      if (level === "info") return;

      try {
        Sentry.captureMessage(message, {
          level: SENTRY_LEVEL[level],
          ...(data !== undefined ? { extra: data } : {}),
        });
      } catch {
        // Capture is best-effort and must never throw into callers.
      }
    });
  }

  return {
    info: (message: string, context?: Record<string, unknown>) => {
      recordClientLog("info", message, context);
    },
    warn: (message: string, context?: Record<string, unknown>) => {
      recordClientLog("warn", message, context);
    },
    error: (message: string, context?: unknown) => {
      recordClientLog("error", message, context);
    },
  };
}
