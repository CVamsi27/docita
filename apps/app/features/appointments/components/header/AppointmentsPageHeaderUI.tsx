import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { Button } from "@workspace/ui/components/form/button";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { SearchInput } from "@workspace/ui/components/form/search-input";
import { Plus, Sparkles } from "lucide-react";
import type { Appointment } from "@workspace/types";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";

interface AppointmentsPageHeaderUIProps {
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
  selectedDate?: Date;
  /** When the add dialog needs the first day with open slots, move the calendar (e.g. today fully booked). */
  onAdjustSchedulingDate?: (next: Date) => void;
  isAddDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPatientId?: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchRowAction?: React.ReactNode;
}
export function AppointmentsPageHeaderUI({
  onAppointmentAdded,
  selectedDate,
  onAdjustSchedulingDate,
  isAddDialogOpen,
  onOpenChange,
  preselectedPatientId,
  searchQuery,
  setSearchQuery,
  searchRowAction,
}: AppointmentsPageHeaderUIProps) {
  const { openOverlay } = useAskAi();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        description="Schedule and manage patient appointments"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() =>
                openOverlay({
                  id: "appointments",
                  label: "on appointments",
                  payload: { kind: "appointments" },
                })
              }
              data-testid="appointments-ask-ai"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Ask AI
            </Button>
            <Button onClick={() => onOpenChange(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New appointment
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder="Enter patient name or phone"
          ariaLabel="Search appointments"
        />
        {searchRowAction ? (
          <div className="ml-auto shrink-0">{searchRowAction}</div>
        ) : null}
      </div>
      <AddAppointmentDialog
        onAppointmentAdded={onAppointmentAdded}
        selectedDate={selectedDate}
        onAdjustSchedulingDate={onAdjustSchedulingDate}
        open={isAddDialogOpen}
        onOpenChange={onOpenChange}
        {...(preselectedPatientId && { preselectedPatientId })}
      />
    </div>
  );
}