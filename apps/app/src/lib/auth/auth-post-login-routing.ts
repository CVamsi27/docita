import type { NavigateFunction } from "react-router";
import {
  persistVerificationEmailStatus,
  type User,
} from "./auth-context-helpers";

export function routeUserAfterLogin(
  user: User,
  navigate: NavigateFunction,
): void {
  if (user.emailVerified === false) {
    persistVerificationEmailStatus("pending");
    navigate("/verify-email-sent");
    return;
  }

  persistVerificationEmailStatus(null);
  if (!user.clinicId) {
    switch (user.onboardingStep) {
      case "JOINING_CLINIC":
        navigate("/join-request-status");
        break;
      case "CREATING_CLINIC":
        navigate("/onboarding");
        break;
      case "CHOOSE_PATH":
      case "NOT_STARTED":
      default:
        navigate("/choose-path");
    }
  }
}

export function routeUserAfterRegister(
  user: User,
  navigate: NavigateFunction,
  verificationEmailSent?: boolean,
): void {
  if (user.emailVerified === false) {
    persistVerificationEmailStatus(
      verificationEmailSent === false ? "failed" : "pending",
    );
    navigate("/verify-email-sent");
    return;
  }

  persistVerificationEmailStatus(null);
  if (!user.clinicId) {
    navigate("/choose-path");
    return;
  }

  navigate("/dashboard");
}