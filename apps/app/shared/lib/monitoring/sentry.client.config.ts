"use client";

declare global {
  interface Window {
    __sentryReady?: boolean;
  }
}
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

  if (window.__sentryReady) {
    return;
  }

  void loadSentryModule().then((Sentry) => {
    if (!Sentry) {
      return;
    }

    try {
      const userInfo = getUserContextFromStorage();
      if (userInfo) {
        Sentry.setUser({
          id: userInfo.userId,
          email: userInfo.email,
          username: userInfo.role,
        });

        Sentry.setTag("clinic_id", userInfo.clinicId);
        Sentry.setTag("role", userInfo.role);
      }

      window.addEventListener("unhandledrejection", (event) => {
        Sentry.captureException(
          new Error(
            `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
          ),
        );
      });

      window.__sentryReady = true;
    } catch {
      // Client-side monitoring must never block app boot.
    }
  });
}

function getUserContextFromStorage(): {
  userId: string;
  clinicId: string;
  email: string;
  role: string;
} | null {
  try {
    const userStr = sessionStorage.getItem("docita_user_context");
    if (userStr) {
      return JSON.parse(userStr);
    }

    return null;
  } catch {
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
      return sentryModule.captureException(normalizedError, {
        contexts: context ? { custom: context } : undefined,
      });
    }

    void loadSentryModule().then((Sentry) => {
      if (!Sentry) {
        return;
      }

      Sentry.captureException(normalizedError, {
        contexts: context ? { custom: context } : undefined,
      });
    });

    return;
  } catch {
    return;
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
  } catch {
    // Monitoring calls are best-effort and must remain non-blocking.
  }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = "user-action",
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
  } catch {
    // Breadcrumb recording is best-effort and must remain non-blocking.
  }
}
