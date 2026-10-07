import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";

/**
 * These helpers stay pure TypeScript (no hooks), so they return `PublicBooking`
 * catalog keys and let the component resolve them with `t()`. Returning English
 * here would pin the funnel to one language regardless of locale.
 *
 * Keys built at runtime are invisible to the namespace-registration test, which
 * only resolves literal `t("...")` call sites. `mobile-layout-hint-keys.test.ts`
 * covers this seam instead.
 */

/** Catalog key for a mobile step's heading, or null for an unknown step. */
export function stepHeadingKey(
  step: PublicBookingMobileStep,
): string | null {
  switch (step) {
    case "visit":
      return "mobileLayout.stepHeading.visit";
    case "contact":
      return "mobileLayout.stepHeading.contact";
    case "review":
      return "mobileLayout.stepHeading.review";
    default:
      return null;
  }
}

/** Catalog key for a mobile step's supporting description. */
export function stepDescriptionKey(
  step: PublicBookingMobileStep,
): string | null {
  switch (step) {
    case "visit":
      return "mobileLayout.stepDescription.visit";
    case "contact":
      return "mobileLayout.stepDescription.contact";
    case "review":
      return "mobileLayout.stepDescription.review";
    default:
      return null;
  }
}

export function visitContinueHintKey(
  visitCanContinue: boolean,
  siteKey: string | null | undefined,
  turnstileToken: string | null | undefined,
): string | null {
  if (visitCanContinue) return null;
  if (siteKey && !turnstileToken) return "mobileLayout.visitBlocked";
  return null;
}

export function contactContinueHintKey(
  contactCanContinue: boolean,
  firstName: string,
  lastName: string,
  phone: string,
  requiresOtp: boolean | null | undefined,
  verificationToken: string | null,
): string | null {
  if (contactCanContinue) return null;
  if (!firstName.trim() || !lastName.trim()) {
    return "mobileLayout.contactMissingName";
  }
  if (!phone.trim()) {
    return "mobileLayout.contactMissingPhone";
  }
  if (requiresOtp === true && !verificationToken) {
    return "mobileLayout.contactMissingOtp";
  }
  return null;
}