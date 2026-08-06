import type { User } from "@/lib/auth/auth-context";

/**
 * Resolves the post-verification destination for a user.
 * Shared by VerifyEmailSentPageContent (fallback to the resend page) and
 * VerifyEmailVerifiedClient (fallback to the verified page). Extracted from
 * the Next.js sources where the logic was duplicated in both files.
 */
export function getNextPathForVerifiedUser(
  user: User | null,
  fallbackNext: string,
): string {
  if (!user) return `/login?next=${fallbackNext}`;

  if (user.clinicId || user.onboardingStep === "COMPLETED") return "/today";

  switch (user.onboardingStep) {
    case "JOINING_CLINIC":
      return "/join-request-status";
    case "CREATING_CLINIC":
      return "/onboarding";
    default:
      return "/choose-path";
  }
}
