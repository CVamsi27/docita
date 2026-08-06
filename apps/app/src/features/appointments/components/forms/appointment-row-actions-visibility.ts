interface AppointmentRowActionVisibilityInput {
  appointmentId?: string | null;
  patientId?: string | null;
  status?: string | null;
  hasScheduleFollowUp?: boolean;
  hasPrintOpdSlip?: boolean;
}

interface AppointmentRowActionVisibility {
  showViewPatient: boolean;
  showFollowUp: boolean;
  showPrintOpdSlip: boolean;
  showCancel: boolean;
  showNoShow: boolean;
  /** True when at least one menu item should render. */
  hasAnyAction: boolean;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "no-show",
  "cancelled",
]);

const NO_SHOW_BLOCKED_STATUSES = new Set([
  "in-progress",
  "completed",
  "no-show",
  "cancelled",
]);

/** OPD slips are only printable before/at the visit, not after it concludes. */
const OPD_SLIP_ALLOWED_STATUSES = new Set(["scheduled", "checked-in"]);

/**
 * Pure visibility rules for the kebab menu. Exposed so tests (and callers
 * that want to hide an empty trigger early) can reason about the gating
 * without spinning up Radix in jsdom.
 */
export function getAppointmentRowActionVisibility({
  appointmentId,
  patientId,
  status,
  hasScheduleFollowUp = false,
  hasPrintOpdSlip = false,
}: AppointmentRowActionVisibilityInput): AppointmentRowActionVisibility {
  const normalizedStatus = (status ?? "").toLowerCase();
  const showViewPatient = Boolean(patientId);
  const showFollowUp = Boolean(patientId) && hasScheduleFollowUp;
  const showPrintOpdSlip =
    Boolean(appointmentId) &&
    hasPrintOpdSlip &&
    OPD_SLIP_ALLOWED_STATUSES.has(normalizedStatus);
  const showCancel =
    Boolean(appointmentId) && !TERMINAL_STATUSES.has(normalizedStatus);
  const showNoShow =
    Boolean(appointmentId) && !NO_SHOW_BLOCKED_STATUSES.has(normalizedStatus);

  return {
    showViewPatient,
    showFollowUp,
    showPrintOpdSlip,
    showCancel,
    showNoShow,
    hasAnyAction:
      showViewPatient ||
      showFollowUp ||
      showPrintOpdSlip ||
      showCancel ||
      showNoShow,
  };
}
