import type { AppointmentListItem, MarkDoctorDelayInput } from "@workspace/data-access";

export interface AppointmentsPageContentBodyProps {
  state: ReturnType<typeof import("@/features/appointments/hooks/use-appointments-logic").useAppointmentsLogic>["state"];
  handlers: ReturnType<typeof import("@/features/appointments/hooks/use-appointments-logic").useAppointmentsLogic>["handlers"];
  handleScheduleFollowUp: (appointment: AppointmentListItem) => void;
  appointmentRequestsRef: React.RefObject<HTMLDivElement | null>;
  isDelayDialogOpen: boolean;
  setIsDelayDialogOpen: (open: boolean) => void;
  isMarkingDelay: boolean;
  onMarkDelay: (input: MarkDoctorDelayInput) => void;
}
