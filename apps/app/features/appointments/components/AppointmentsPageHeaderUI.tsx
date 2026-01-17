import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/AddAppointmentDialogContainer";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { Plus, Search } from "lucide-react";

interface AppointmentsPageHeaderUIProps {
  onAppointmentAdded: () => void;
  selectedDate?: Date;
  isAddDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatientId?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function AppointmentsPageHeaderUI({
  onAppointmentAdded,
  selectedDate,
  isAddDialogOpen,
  onOpenChange,
  preselectedPatientId,
  searchQuery,
  setSearchQuery,
}: AppointmentsPageHeaderUIProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage patient appointments.
          </p>
        </div>
        <div className="relative flex-1 max-w-md md:ml-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => onOpenChange(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
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
