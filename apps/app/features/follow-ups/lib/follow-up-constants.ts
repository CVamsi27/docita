import type { FollowUpStatus } from "@workspace/types";

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  PENDING: "Pending",
  REMINDER_SENT: "Reminder sent",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
