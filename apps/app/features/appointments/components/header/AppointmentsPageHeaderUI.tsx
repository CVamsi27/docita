import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { PageHeader } from "@workspace/ui/components/page-header";
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
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        description="Schedule and manage patient appointments."
        actions={
          <Button onClick={() => onOpenChange(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by patient name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
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
