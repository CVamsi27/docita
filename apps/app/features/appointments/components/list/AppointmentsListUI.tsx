import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
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
import { TIME_SLOTS } from "@/features/appointments/hooks/use-appointments-logic";

interface AppointmentsListUIProps {
  date: Date | undefined;
  loading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  doctorsList: { id: string; name: string }[];
  selectedDoctorId: string | undefined;
  filteredAppointments: (Appointment & { patient?: Patient })[];
  hasMoreAppointments?: boolean;
  isToday: boolean;
  currentTimeSlot: string;
  currentTimeSlotRef: React.RefObject<HTMLDivElement | null>;
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
  activeStartHour = 9,
  activeEndHour = 18,
}: AppointmentsListUIProps) {
  const [showEarlierHours, setShowEarlierHours] = useState(false);
  const [showLaterHours, setShowLaterHours] = useState(false);

  const earlierSlots = TIME_SLOTS.filter((slot) => {
    const hour = parseInt(slot.split(":")[0] ?? "0", 10);
    return hour < activeStartHour;
  });

  const activeSlots = TIME_SLOTS.filter((slot) => {
    const hour = parseInt(slot.split(":")[0] ?? "0", 10);
    return hour >= activeStartHour && hour < activeEndHour;
  });

  const laterSlots = TIME_SLOTS.filter((slot) => {
    const hour = parseInt(slot.split(":")[0] ?? "0", 10);
    return hour >= activeEndHour;
  });

  const renderSlot = (slotTime: string) => {
    const isCurrentSlot = isToday && slotTime === currentTimeSlot;
    return (
      <div key={slotTime} ref={isCurrentSlot ? currentTimeSlotRef : null}>
        <TimeSlotRow
          slotTime={slotTime}
          appointments={filteredAppointments}
          selectedDate={date || new Date()}
          isCurrentSlot={isCurrentSlot}
          checkingIn={checkingIn}
          startingConsultationId={startingConsultationId}
          onCheckIn={onCheckIn}
          onStartConsultation={onStartConsultation}
          onCancelClick={onCancelClick}
          onNoShowClick={onNoShowClick}
          currentUserId={currentUserId}
        />
      </div>
    );
  };

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="border-b border-border bg-muted/30 dark:bg-muted/10">
        <CardTitle className="text-lg">
          Schedule for {date ? format(date, "MMMM d, yyyy") : "Selected Date"}
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
              message="Failed to load appointments."
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
            {filteredAppointments.length === 0 && (
              <div className="p-6">
                <EmptyState
                  icon={CalendarDays}
                  title="No appointments scheduled"
                  description="No appointments scheduled for this day."
                  className="h-[200px] border-2 border-dashed border-border rounded-lg bg-muted/10"
                />
              </div>
            )}

            {earlierSlots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowEarlierHours((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-b border-border"
                >
                  {showEarlierHours ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showEarlierHours
                    ? "Hide earlier hours"
                    : `Show earlier hours (before ${activeStartHour}:00)`}
                </button>
                {showEarlierHours && earlierSlots.map(renderSlot)}
              </>
            )}

            {activeSlots.map(renderSlot)}

            {laterSlots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowLaterHours((v) => !v)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border"
                >
                  {showLaterHours ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showLaterHours
                    ? "Hide later hours"
                    : `Show later hours (after ${activeEndHour}:00)`}
                </button>
                {showLaterHours && laterSlots.map(renderSlot)}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
