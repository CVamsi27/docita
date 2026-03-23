"use client";

import * as Sentry from "@sentry/nextjs";

type WindowWithSentryReady = Window & { __sentryReady?: boolean };

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === "development";

export function initializeSentryClient() {
  if (!SENTRY_DSN || isDev) {
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

    (window as WindowWithSentryReady).__sentryReady = true;
  } catch {

  }
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
  if (isDev) {
    return;
  }

  try {
    return Sentry.captureException(
      typeof error === "string" ? new Error(error) : error,
      {
        contexts: context ? { custom: context } : undefined,
      },
    );
  } catch {
    return;
  }
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
) {
  if (isDev) {

    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch {

  }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = "user-action",
) {
  try {
    Sentry.addBreadcrumb({
      message,
      level: "info",
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch {

  }
}

export { Sentry };
