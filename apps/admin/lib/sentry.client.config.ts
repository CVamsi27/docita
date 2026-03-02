

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV === "development";

export function initializeSentryClient() {
  if (!SENTRY_DSN || isDev) {
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

  }
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
    Sentry.captureException(
      typeof error === "string" ? new Error(error) : error,
      {
        contexts: context ? { custom: context } : undefined,
      },
    );
  } catch (err) {

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
  } catch (err) {

  }
}

export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category: string = "admin-action",
) {
  try {
    Sentry.addBreadcrumb({
      message,
      level: "info",
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (err) {

  }
}

export { Sentry };
