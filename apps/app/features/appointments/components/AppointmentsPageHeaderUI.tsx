
import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/AddAppointmentDialogContainer";

interface AppointmentsPageHeaderUIProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  isAddDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatientId?: string;
}

export function AppointmentsPageHeaderUI({
  onAppointmentAdded,
  selectedDate,
  isAddDialogOpen,
  onOpenChange,
  preselectedPatientId
}: AppointmentsPageHeaderUIProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground mt-1">
          Schedule and manage patient appointments.
        </p>
      </div>
      <AddAppointmentDialog
        onAppointmentAdded={onAppointmentAdded}
        {...(selectedDate && { selectedDate })}
        open={isAddDialogOpen}
        onOpenChange={onOpenChange}
        {...(preselectedPatientId && { preselectedPatientId })}
      />
    </div>
  );
}
