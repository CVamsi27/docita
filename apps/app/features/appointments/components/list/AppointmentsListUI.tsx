import { useMemo } from "react";
import { format } from "date-fns";
import { CalendarDays, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { ErrorState } from "@workspace/ui/components/error-state";
import { Appointment, Patient } from "@workspace/types";
import { TimeSlotRow } from "@/features/appointments/components/forms/TimeSlotRow";

interface AppointmentsListUIProps {
  date: Date | undefined;
  loading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  doctorsList: { id: string; name: string }[];
  selectedDoctorId: string | undefined;
  filteredAppointments: (Appointment & { patient?: Patient })[];
  hasMoreAppointments?: boolean;
  isToday?: boolean;
  currentTimeSlot?: string;
  currentTimeSlotRef?: React.RefObject<HTMLDivElement | null>;
  checkingIn: string | null;
  startingConsultationId: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  currentUserId?: string;
}

export function AppointmentsListUI({
  date,
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
  const emptyStateDescription = selectedDoctorName
    ? `Try another date or clear the Dr. ${selectedDoctorName} filter`
    : "Try another date or schedule the first appointment for this day";

  if (loading) {
    return (
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardContent className="py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p>Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-border/60 bg-card/80 shadow-sm">
        <CardContent className="p-6">
          <ErrorState
            message="We could not load these appointments. Please try again."
            onRetry={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit overflow-hidden border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <CardTitle className="text-lg">
              Appointments for {format(date ?? new Date(), "MMMM d, yyyy")}
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedDoctorName
                ? `Dr. ${selectedDoctorName} selected`
                : "Sorted by start time"}
            </p>
          </div>
          <div className="shrink-0 text-xs font-medium text-muted-foreground">
            {appointmentsByTime.length} appointment
            {appointmentsByTime.length !== 1 ? "s" : ""}
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

          {appointmentsByTime.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No appointments scheduled"
              description={emptyStateDescription}
              className="min-h-[220px] rounded-xl border border-dashed border-border bg-muted/20"
            />
          ) : (
            <div className="space-y-2.5">
              {appointmentsByTime.map((apt) => (
                <div
                  key={apt.id || `${apt.patientId}-${apt.startTime}`}
                  ref={
                    isToday &&
                    currentTimeSlotRef &&
                    currentTimeSlot &&
                    format(new Date(apt.startTime), "HH:mm") === currentTimeSlot
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
                    currentUserId={currentUserId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
