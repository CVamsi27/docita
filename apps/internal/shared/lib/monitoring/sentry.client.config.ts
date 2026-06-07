"use client";

import {
  bootstrapSentryClient,
  createLazySentryClientLoader,
} from "@workspace/utils";

type SentryModule = typeof import("@sentry/nextjs");

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const { isSentryEnabled, loadSentryModule } =
  createLazySentryClientLoader<SentryModule>({
    importModule: () => import("@sentry/nextjs"),
    dsn: SENTRY_DSN,
  });

export function initializeSentryClient() {
  if (!isSentryEnabled()) {
    return;
  }

  bootstrapSentryClient({
    loadSentryModule,
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
