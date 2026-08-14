// The shared Sentry client setup (init options, PHI scrubbing, capture
// helpers, logger) lives in @workspace/utils. This file only binds the
// clinician app's DSN (define-replaced at build time) and user context.
import { createSentryClientConfig } from "@workspace/utils";

type SentryModule = typeof import("@sentry/react");

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;

interface AppUserContext {
  userId: string;
  clinicId: string;
  email: string;
  role: string;
}

function getUserContextFromStorage(): AppUserContext | null {
  try {
    const userStr = sessionStorage.getItem("docita_user_context");
    if (userStr) return JSON.parse(userStr);

    return null;
  } catch {
    return null;
  }
}

const config = createSentryClientConfig<SentryModule, AppUserContext>({
  dsn: SENTRY_DSN,
  importModule: () => import("@sentry/react"),
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
});

export const initializeSentryClient = config.initializeSentryClient;
export const captureException = config.captureException;
export const captureMessage = config.captureMessage;
export const logger = config.logger;
