"use client";

type SentryModule = typeof import("@sentry/nextjs");
type SentrySeverityLevel =
  | "fatal"
  | "error"
  | "warning"
  | "log"
  | "info"
  | "debug";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === "development";
let sentryModule: SentryModule | null = null;
let sentryModulePromise: Promise<SentryModule | null> | null = null;

const isSentryEnabled = () =>
  typeof window !== "undefined" && Boolean(SENTRY_DSN) && !isDev;

async function loadSentryModule(): Promise<SentryModule | null> {
  if (!isSentryEnabled()) {
    return null;
  }

  if (sentryModule) {
    return sentryModule;
  }

  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/nextjs")
      .then((module) => {
        sentryModule = module;
        return module;
      })
      .catch(() => null);
  }

  return sentryModulePromise;
}

export function initializeSentryClient() {
  if (!isSentryEnabled()) {
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    try {
      const adminInfo = getAdminContextFromStorage();
      if (adminInfo) {
        Sentry.setUser({
          id: adminInfo.adminId,
          email: adminInfo.email,
          username: adminInfo.role,
        });
        Sentry.setTag("role", adminInfo.role);
        Sentry.setTag("app", "admin");
      }

      window.addEventListener("unhandledrejection", (event) => {
        Sentry.captureException(
          new Error(
            `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
          ),
        );
      });
    } catch (error) {
      void error;
    }
  });
}

function getAdminContextFromStorage(): {
  adminId: string;
  email: string;
  role: string;
} | null {
  try {
    const adminStr = sessionStorage.getItem("docita_admin_context");
    if (adminStr) {
      return JSON.parse(adminStr);
    }
    return null;
  } catch (error) {
    void error;
    return null;
  }
}

export function captureException(
  error: Error | string,
  context?: Record<string, unknown>,
) {
  if (!isSentryEnabled()) {
    return;
  }

  const normalizedError = typeof error === "string" ? new Error(error) : error;

  try {
    if (sentryModule) {
      sentryModule.captureException(normalizedError, {
        contexts: context ? { custom: context } : undefined,
      });
      return;
    }

    void loadSentryModule().then((Sentry) => {
      if (!Sentry) {
        return;
      }

      Sentry.captureException(normalizedError, {
        contexts: context ? { custom: context } : undefined,
      });
    });
  } catch (captureError) {
    void captureError;
  }
}

export function captureMessage(
  message: string,
  level: SentrySeverityLevel = "info",
) {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    if (sentryModule) {
      sentryModule.captureMessage(message, level);
      return;
    }

    void loadSentryModule().then((Sentry) => {
      Sentry?.captureMessage(message, level);
    });
  } catch (captureError) {
    void captureError;
  }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = "admin-action",
) {
  if (!isSentryEnabled()) {
    return;
  }

  try {
    if (sentryModule) {
      sentryModule.addBreadcrumb({
        message,
        level: "info",
        category,
        data,
        timestamp: Date.now() / 1000,
      });
      return;
    }

    void loadSentryModule().then((Sentry) => {
      Sentry?.addBreadcrumb({
        message,
        level: "info",
        category,
        data,
        timestamp: Date.now() / 1000,
      });
    });
  } catch (captureError) {
    void captureError;
  }
}
