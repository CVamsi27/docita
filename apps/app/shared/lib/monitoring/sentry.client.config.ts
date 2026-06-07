"use client";

import {
  bootstrapSentryClient,
  createLazySentryClientLoader,
} from "@workspace/utils";

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

const {
  isSentryEnabled,
  getLoadedSentryModule,
  loadSentryModule,
  runWithSentryModule,
} = createLazySentryClientLoader<SentryModule>({
  importModule: () => import("@sentry/nextjs"),
  dsn: SENTRY_DSN,
});

export function initializeSentryClient() {
  if (!isSentryEnabled() || window.__sentryReady) {
    return;
  }

  bootstrapSentryClient({
    loadSentryModule,
    getContext: getUserContextFromStorage,
    applyContext: (Sentry, userInfo) => {
      Sentry.setUser({
        id: userInfo.userId,
        email: userInfo.email,
        username: userInfo.role,
      });

      Sentry.setTag("clinic_id", userInfo.clinicId);
      Sentry.setTag("role", userInfo.role);
    },
    onReady: () => {
      window.__sentryReady = true;
    },
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
    if (userStr) return JSON.parse(userStr);

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
    const loadedModule = getLoadedSentryModule();
    if (loadedModule) {
      return loadedModule.captureException(normalizedError, {
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
    runWithSentryModule((Sentry) => {
      Sentry.captureMessage(message, level);
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
    runWithSentryModule((Sentry) => {
      Sentry.addBreadcrumb({
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
