// The shared Sentry client setup (init options, PHI scrubbing, capture
// helpers, logger) lives in @workspace/utils. This file only binds the
// internal admin app's DSN (define-replaced at build time) and admin context.
import { createSentryClientConfig } from "@workspace/utils";

type SentryModule = typeof import("@sentry/react");

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;

interface AdminUserContext {
  adminId: string;
  email: string;
  role: string;
}

function getAdminContextFromStorage(): AdminUserContext | null {
  try {
    const adminStr = sessionStorage.getItem("docita_admin_context");
    if (adminStr) return JSON.parse(adminStr);

    return null;
  } catch {
    return null;
  }
}

const config = createSentryClientConfig<SentryModule, AdminUserContext>({
  dsn: SENTRY_DSN,
  importModule: () => import("@sentry/react"),
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

export const initializeSentryClient = config.initializeSentryClient;
export const captureException = config.captureException;
export const captureMessage = config.captureMessage;
export const logger = config.logger;
