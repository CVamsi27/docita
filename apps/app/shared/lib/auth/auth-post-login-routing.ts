import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  persistVerificationEmailStatus,
  type User,
} from "./auth-context-helpers";

export function routeUserAfterLogin(
  user: User,
  router: AppRouterInstance,
): void {
  if (user.emailVerified === false) {
    persistVerificationEmailStatus("pending");
    router.push("/verify-email-sent");
    return;
  }

  persistVerificationEmailStatus(null);
  if (!user.clinicId) {
    switch (user.onboardingStep) {
      case "JOINING_CLINIC":
        router.push("/join-request-status");
        break;
      case "CREATING_CLINIC":
        router.push("/onboarding");
        break;
      case "CHOOSE_PATH":
      case "NOT_STARTED":
      default:
        router.push("/choose-path");
    }
  }
}

export function routeUserAfterRegister(
  user: User,
  router: AppRouterInstance,
  verificationEmailSent?: boolean,
): void {
  if (user.emailVerified === false) {
    persistVerificationEmailStatus(
      verificationEmailSent === false ? "failed" : "pending",
    );
    router.push("/verify-email-sent");
    return;
  }

  persistVerificationEmailStatus(null);
  if (!user.clinicId) {
    router.push("/choose-path");
    return;
  }

  router.push("/dashboard");
}
