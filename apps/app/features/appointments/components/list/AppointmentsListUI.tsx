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
  activeStartHour?: number;
  activeEndHour?: number;
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

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="border-b border-border bg-muted/30 dark:bg-muted/10">
        <CardTitle className="text-lg">
          Schedule for {format(date ?? new Date(), "MMMM d, yyyy")}
          {selectedDoctorId &&
            doctorsList.find((d) => d.id === selectedDoctorId) && (
              <span className="text-muted-foreground font-normal text-sm ml-2">
                - Dr. {doctorsList.find((d) => d.id === selectedDoctorId)?.name}
              </span>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p>Loading appointments...</p>
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorState
              message="We could not load these appointments. Please try again."
              onRetry={onRetry}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {hasMoreAppointments && (
              <div className="border-b border-border bg-warning/10 px-4 py-2 text-xs text-muted-foreground">
                Showing first 100 appointments for this view. Refine filters to
                narrow results.
              </div>
            )}
            {appointmentsByTime.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={CalendarDays}
                  title="No appointments scheduled"
                  description="There are no appointments for this day."
                  className="h-[200px] border-2 border-dashed border-border rounded-lg bg-muted/10"
                />
              </div>
            )}

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
      </CardContent>
    </Card>
  );
}
