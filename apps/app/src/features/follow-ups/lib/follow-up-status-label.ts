import type { FollowUpStatus } from "@workspace/types";

/** Resolve a follow-up status enum to a translated label (FollowUps.statusLabels). */
export function followUpStatusLabel(
  status: FollowUpStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "PENDING":
      return t("statusLabels.pending");
    case "REMINDER_SENT":
      return t("statusLabels.reminderSent");
    case "BOOKED":
      return t("statusLabels.booked");
    case "COMPLETED":
      return t("statusLabels.completed");
    case "CANCELLED":
      return t("statusLabels.cancelled");
    case "EXPIRED":
      return t("statusLabels.expired");
  }
}
