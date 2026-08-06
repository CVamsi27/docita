import type { LeaveType } from "@workspace/types";

/** Resolve a leave-type enum to a translated label. Keys live under Settings.leaveTypes. */
export function leaveTypeLabel(
  type: LeaveType,
  t: (key: string) => string,
): string {
  switch (type) {
    case "CASUAL":
      return t("leaveTypes.casual");
    case "SICK":
      return t("leaveTypes.sick");
    case "EARNED":
      return t("leaveTypes.earned");
    case "COMP_OFF":
      return t("leaveTypes.compOff");
    case "UNPAID":
      return t("leaveTypes.unpaid");
    case "HOLIDAY":
      return t("leaveTypes.holiday");
  }
}
