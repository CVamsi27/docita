type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown> | unknown;

const SENTRY_LEVEL: Record<LogLevel, "info" | "warning" | "error"> = {
  info: "info",
  warn: "warning",
  error: "error",
};

type SentryModule = typeof import("@sentry/nextjs");

let sentryModulePromise: Promise<SentryModule | null> | null = null;

function loadSentryModule(): Promise<SentryModule | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/nextjs").catch(() => null);
  }

  return sentryModulePromise;
}

function isPlainRecord(context: LogContext): context is Record<string, unknown> {
  return (
    typeof context === "object" &&
    context !== null &&
    !Array.isArray(context)
  );
}

function toRecord(context: LogContext): Record<string, unknown> | undefined {
  if (context === undefined) return undefined;
  if (isPlainRecord(context)) {
    return context;
  }
  return { value: context };
}

function recordClientLog(level: LogLevel, message: string, context?: LogContext) {
  const data = toRecord(context);

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) return;

    try {
      Sentry.addBreadcrumb({
        category: "logger",
        level: SENTRY_LEVEL[level],
        message,
        data,
      });
    } catch {
      // Breadcrumb recording is best-effort.
    }

    if (level === "info") return;

    try {
      Sentry.captureMessage(message, {
        level: SENTRY_LEVEL[level],
        extra: data,
      });
    } catch {
      // Capture is best-effort and must never throw into callers.
    }
  });
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    recordClientLog("info", message, context);
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    recordClientLog("warn", message, context);
  },
  error: (message: string, context?: LogContext) => {
    recordClientLog("error", message, context);
  },
};
