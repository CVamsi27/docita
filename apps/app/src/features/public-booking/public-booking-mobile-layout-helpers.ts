import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";

export function stepLabel(step: PublicBookingMobileStep): string {
  switch (step) {
    case "visit":
      return "Doctor, date, and time";
    case "contact":
      return "Your contact details";
    case "review":
      return "Review and send";
    default:
      return "";
  }
}

export function visitContinueHint(
  visitCanContinue: boolean,
  siteKey: string | null | undefined,
  turnstileToken: string | null | undefined,
): string | null {
  if (visitCanContinue) return null;
  if (siteKey && !turnstileToken) return "Complete verification above, then continue.";
  return null;
}

export function contactContinueHint(
  contactCanContinue: boolean,
  firstName: string,
  lastName: string,
  phone: string,
  requiresOtp: boolean | null | undefined,
  verificationToken: string | null,
): string | null {
  if (contactCanContinue) return null;
  if (!firstName.trim() || !lastName.trim()) {
    return "Enter your first and last name.";
  }
  if (!phone.trim()) {
    return "Enter the phone number this clinic has on file.";
  }
  if (requiresOtp === true && !verificationToken) return "Request the WhatsApp code and enter it above.";
  return null;
}
