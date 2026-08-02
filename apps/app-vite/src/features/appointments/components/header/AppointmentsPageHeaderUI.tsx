import { AddAppointmentDialogContainer as AddAppointmentDialog } from "@/features/appointments/components/dialogs/AddAppointmentDialogContainer";
import { useTranslation } from "react-i18next";
import { Button, PageHeader, SearchInput } from "@workspace/ui/components";
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
  const { t } = useTranslation("Appointments");
  const { openOverlay } = useAskAi();
  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
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
              aria-label={t("askAiAriaLabel")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("askAiButton")}
            </Button>
            <Button onClick={() => onOpenChange(true)} aria-label={t("newAppointmentAriaLabel")}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newAppointmentButton")}
            </Button>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery("")}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchAriaLabel")}
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
