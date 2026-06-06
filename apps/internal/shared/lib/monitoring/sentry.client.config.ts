"use client";

type SentryModule = typeof import("@sentry/nextjs");

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

  if (sentryModule) return sentryModule;

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
    if (adminStr) return JSON.parse(adminStr);
    return null;
  } catch (error) {
    void error;
    return null;
  }
}
