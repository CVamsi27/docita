import type { GuidedTourStatusValue } from "@workspace/types";

export interface TourEligibilityInput {
  /** `useFeatureFlag` result — `undefined` while flags load. */
  flagEnabled: boolean | undefined;
  isAdmin: boolean;
  /** `user.onboardingStep === "COMPLETED"`. */
  onboardingCompleted: boolean;
  /** `isNewClinicDashboard(stats)` — 0 patients/appointments/prescriptions. */
  isNewClinic: boolean;
  /** Server-recorded tour status (`undefined` while it loads). */
  serverStatus: GuidedTourStatusValue | undefined;
}

/**
 * The welcome tour auto-starts exactly once, for a freshly-onboarded clinic
 * admin on an empty dashboard, only while the flag is on and the server has
 * never recorded a run. COMPLETED / SKIPPED / IN_PROGRESS all suppress it.
 */
export function shouldAutoStartTour(input: TourEligibilityInput): boolean {
  return (
    input.flagEnabled === true &&
    input.isAdmin &&
    input.onboardingCompleted &&
    input.isNewClinic &&
    input.serverStatus === "NOT_STARTED"
  );
}

export interface ChecklistVisibilityInput {
  flagEnabled: boolean | undefined;
  isAdmin: boolean;
  /** `Boolean(checklistDismissedAt)`. */
  checklistDismissed: boolean;
}

/** The getting-started checklist shows for an admin until they dismiss it. */
export function shouldShowChecklist(input: ChecklistVisibilityInput): boolean {
  return (
    input.flagEnabled === true && input.isAdmin && !input.checklistDismissed
  );
}
