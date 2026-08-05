import { useMemo } from "react";
import { formatClinicHalfHourSlotKey, formatClinicPickerIsoLabel } from "@workspace/utils";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, DataState } from "@workspace/ui/components";
import type { AppointmentListItem } from "@workspace/data-access";
import { TimeSlotRow } from "@/features/appointments/components/forms/TimeSlotRow";
import type { AppointmentRowActionProps } from "@/features/appointments/components/appointment-row-action-props.types";

interface AppointmentsListUIProps extends AppointmentRowActionProps {
  selectedPickerIso: string;
  clinicTz: string;
  canViewAllDoctors?: boolean;
  loading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  doctorsList: { id: string; name: string }[];
  selectedDoctorId: string | undefined;
  filteredAppointments: AppointmentListItem[];
  hasMoreAppointments?: boolean;
  isToday?: boolean;
  currentTimeSlot?: string;
  currentTimeSlotRef?: React.RefObject<HTMLDivElement | null>;
}

export function AppointmentsListUI({
  selectedPickerIso,
  clinicTz,
  canViewAllDoctors = true,
  loading,
  isError,
  onRetry,
  doctorsList,
  selectedDoctorId,
  filteredAppointments,
  hasMoreAppointments = false,
  isToday,
  currentTimeSlot,
  currentTimeSlotRef,
  checkingIn,
  startingConsultationId,
  onCheckIn,
  onStartConsultation,
  onCancelClick,
  onNoShowClick,
  onScheduleFollowUp,
  currentUserId,
}: AppointmentsListUIProps) {
  const appointmentsByTime = useMemo(
    () =>
      [...filteredAppointments].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
    [filteredAppointments],
  );
  const selectedDoctorName =
    selectedDoctorId &&
    doctorsList.find((d) => d.id === selectedDoctorId)?.name;
  const emptyStateDescription = !canViewAllDoctors
    ? "You have no appointments on this day. Try another date or schedule one from the list actions menu."
    : selectedDoctorName
      ? `Try another date or clear the Dr. ${selectedDoctorName} filter`
      : "Try another date or schedule the first appointment for this day";

  return (
    <Card className="h-fit overflow-hidden border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <CardTitle className="text-lg">
              Appointments for{" "}
              {formatClinicPickerIsoLabel(
                selectedPickerIso,
                "MMMM d, yyyy",
                clinicTz,
              )}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedDoctorName
                ? `Dr. ${selectedDoctorName} selected`
                : "Sorted by start time"}
            </p>
          </div>
          <div className="shrink-0 text-xs font-medium text-muted-foreground">
            {appointmentsByTime.length === 0
              ? null
              : `${appointmentsByTime.length} appointment${appointmentsByTime.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3 p-4">
          {hasMoreAppointments && (
            <div className="surface-warning rounded-lg px-3 py-2 text-xs">
              Showing the first 100 appointments. Refine the filters to narrow
              results.
            </div>
          )}

          <DataState
            status={
              loading
                ? "loading"
                : isError
                  ? "error"
                  : appointmentsByTime.length === 0
                    ? "empty"
                    : "success"
            }
            loadingMessage="Loading appointments…"
            errorMessage="We could not load these appointments. Please try again."
            onRetry={onRetry}
            emptyTitle="No appointments scheduled"
            emptyDescription={emptyStateDescription}
            emptyIcon={CalendarDays}
            className="min-h-[220px]"
          >
            <div className="space-y-2.5">
              {appointmentsByTime.map((apt) => (
                <div
                  key={apt.id || `${apt.patientId}-${apt.startTime}`}
                  ref={
                    isToday &&
                    currentTimeSlotRef &&
                    currentTimeSlot &&
                    formatClinicHalfHourSlotKey(
                      new Date(apt.startTime),
                      clinicTz,
                    ) === currentTimeSlot
                      ? currentTimeSlotRef
                      : undefined
                  }
                >
                  <TimeSlotRow
                    appointment={apt}
                    checkingIn={checkingIn}
                    startingConsultationId={startingConsultationId}
                    onCheckIn={onCheckIn}
                    onStartConsultation={onStartConsultation}
                    onCancelClick={onCancelClick}
                    onNoShowClick={onNoShowClick}
                    onScheduleFollowUp={onScheduleFollowUp}
                    currentUserId={currentUserId}
                  />
                </div>
              ))}
            </div>
          </DataState>
        </div>
      </CardContent>
    </Card>
  );
}
