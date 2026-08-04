import {
  bootstrapSentryClient,
  createLazySentryClientLoader,
  scrubSentryEventRecord,
} from "@workspace/utils";

declare global {
  interface Window {
    __sentryReady?: boolean;
  }
}

type SentryModule = typeof import("@sentry/react");
type SentrySeverityLevel =
  | "fatal"
  | "error"
  | "warning"
  | "log"
  | "info"
  | "debug";

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;

const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Non-Error promise rejection captured",
  /^Loading chunk \d+ failed/,
  /^ChunkLoadError/,
];

const { isSentryEnabled, getLoadedSentryModule, loadSentryModule, runWithSentryModule } =
  createLazySentryClientLoader<SentryModule>({
    importModule: () => import("@sentry/react"),
    dsn: SENTRY_DSN,
  });

export function initializeSentryClient() {
  if (!isSentryEnabled() || window.__sentryReady) {
    return;
  }

  bootstrapSentryClient({
    loadSentryModule,
    initClient: (Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV ?? "production",
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
        beforeSend(event) {
          return scrubSentryEventRecord(event);
        },
        beforeBreadcrumb(crumb) {
          if (!crumb) return crumb;
          return (
            scrubSentryEventRecord({ breadcrumbs: [crumb] }).breadcrumbs?.[0] ??
            crumb
          );
        },
      });
    },
    getContext: getAdminContextFromStorage,
    applyContext: (Sentry, adminInfo) => {
      Sentry.setUser({
        id: adminInfo.adminId,
        email: adminInfo.email,
        username: adminInfo.role,
      });
      Sentry.setTag("role", adminInfo.role);
      Sentry.setTag("app", "admin");
    },
    onReady: () => {
      window.__sentryReady = true;
    },
  });
}

function getAdminContextFromStorage(): {
  adminId: string;
  email: string;
  role: string;
} | null {
  try {
    const adminStr = sessionStorage.getItem("docita_admin_context");
    if (adminStr) return JSON.parse(adminStr);

    return null;
  } catch {
    return null;
  }
}

export function captureException(
  error: Error | string,
  context?: Record<string, unknown>,
): void {
  if (!isSentryEnabled()) return;

  const normalizedError = typeof error === "string" ? new Error(error) : error;

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

export function captureMessage(
  message: string,
  level: SentrySeverityLevel = "info",
): void {
  if (!isSentryEnabled()) return;

  try {
    runWithSentryModule((Sentry) => {
      Sentry.captureMessage(message, level);
    });
  } catch {
    // Monitoring calls are best-effort and must remain non-blocking.
  }
}
