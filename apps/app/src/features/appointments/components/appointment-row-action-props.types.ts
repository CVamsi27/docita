import type { AppointmentListItem } from "@workspace/data-access";

/**
 * Row-action props shared by every surface that renders an appointment row
 * (TimeSlotRow, AppointmentsListUI). Declared once so the drill-down props
 * cannot drift apart between the row and its container.
 */
export interface AppointmentRowActionProps {
  checkingIn: string | null;
  startingConsultationId: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  onScheduleFollowUp?: (appointment: AppointmentListItem) => void;
  currentUserId?: string;
}
