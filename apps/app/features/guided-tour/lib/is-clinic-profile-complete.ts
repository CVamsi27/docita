import type { AppClinic } from "@workspace/types";

/**
 * "Profile complete" milestone for the getting-started checklist.
 *
 * Name / address / phone / email are required and already collected during the
 * onboarding wizard, so they are NOT meaningful here. A clinic logo is optional
 * and not part of signup, making it a good signal that the admin has gone back
 * and personalised their clinic profile.
 */
export function isClinicProfileComplete(
  clinic: Pick<AppClinic, "logo"> | null | undefined,
): boolean {
  return typeof clinic?.logo === "string" && clinic.logo.trim().length > 0;
}
