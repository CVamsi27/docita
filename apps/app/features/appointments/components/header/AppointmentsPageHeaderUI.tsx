import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { Input } from "@workspace/ui/components/form/input";
import { Button } from "@workspace/ui/components/form/button";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Plus, Search, X } from "lucide-react";
import type { Appointment } from "@workspace/types";

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
}: AppointmentsPageHeaderUIProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Appointments"
        description="Schedule and manage patient appointments"
        actions={
          <Button onClick={() => onOpenChange(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        }
      />

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          placeholder="Enter patient name or phone"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={searchQuery.trim() ? "pl-9 pr-10" : "pl-9"}
          aria-label="Search appointments"
        />
        {searchQuery.trim() ? (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            <SymbolTooltip label="Clear search">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </SymbolTooltip>
          </div>
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
