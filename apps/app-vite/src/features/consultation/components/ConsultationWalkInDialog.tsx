import { useCheckInAppointment } from "@workspace/data-access";
import { AddAppointmentDialogContainer } from "@/features/appointments/components";
import { createWalkInCheckInHandler } from "./consultation-dashboard-ui-helpers";

interface ConsultationWalkInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInAppointment: ReturnType<typeof useCheckInAppointment>;
}

/**
 * Walk-in appointment dialog for the consultation dashboard — wraps
 * `AddAppointmentDialogContainer` with the check-in-on-add handler so
 * `ConsultationDashboardUI` only has to wire up the open state.
 */
export function ConsultationWalkInDialog({
  open,
  onOpenChange,
  checkInAppointment,
}: ConsultationWalkInDialogProps) {
  return (
    <AddAppointmentDialogContainer
      open={open}
      onOpenChange={onOpenChange}
      selectedDate={new Date()}
      mode="walk-in"
      onAppointmentAdded={createWalkInCheckInHandler(checkInAppointment)}
    />
  );
}
