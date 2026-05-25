import type { User } from "@/lib/auth/auth-context";
import { sanitizeAppReturnPath } from "@/lib/auth/safe-return-path";
import { APP_REDIRECT_AFTER_LOGIN_KEY } from "@/lib/auth/session";
import { parseUserRole } from "@/lib/access-control/parse-user-role";
import type { UserRole } from "@workspace/types";

const ROLES_LAND_ON_CONSULTATION = new Set<UserRole>(["DOCTOR", "ADMIN_DOCTOR"]);

export function getPostAuthPath(user: User): string {
  if (user.emailVerified === false) {
    return "/verify-email-sent";
  }

  if (!user.clinicId) {
    switch (user.onboardingStep) {
      case "JOINING_CLINIC":
        return "/join-request-status";
      case "CREATING_CLINIC":
        return "/onboarding";
      case "CHOOSE_PATH":
      case "NOT_STARTED":
      default:
        return "/choose-path";
    }
  }

  if (ROLES_LAND_ON_CONSULTATION.has(parseUserRole(user.role))) {
    return "/consultation";
  }

  return "/today";
}

export function getAuthenticatedLandingPath(user: User): string {
  const fallback = getPostAuthPath(user);

  if (user.emailVerified === false || !user.clinicId) {
    return fallback;
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = sessionStorage.getItem(APP_REDIRECT_AFTER_LOGIN_KEY);
  sessionStorage.removeItem(APP_REDIRECT_AFTER_LOGIN_KEY);
  const safe = sanitizeAppReturnPath(stored);
  return safe ?? fallback;
}
