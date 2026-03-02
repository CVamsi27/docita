import { format } from "date-fns";
import { CalendarDays, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { Appointment, Patient } from "@workspace/types";
import { TimeSlotRow } from "@/features/appointments/components/forms/TimeSlotRow";
import { TIME_SLOTS } from "@/features/appointments/hooks/use-appointments-logic";

interface AppointmentsListUIProps {
  date: Date | undefined;
  loading: boolean;
  doctorsList: { id: string; name: string }[];
  selectedDoctorId: string | undefined;
  filteredAppointments: (Appointment & { patient?: Patient })[];
  isToday: boolean;
  currentTimeSlot: string;
  currentTimeSlotRef: React.RefObject<HTMLDivElement | null>;
  checkingIn: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  userRole?: string;
}

export function AppointmentsListUI({
  date,
  loading,
  doctorsList,
  selectedDoctorId,
  filteredAppointments,
  isToday,
  currentTimeSlot,
  currentTimeSlotRef,
  checkingIn,
  onCheckIn,
  onStartConsultation,
  onCancelClick,
  onNoShowClick,
  userRole,
}: AppointmentsListUIProps) {
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
        ) : (
          <div className="h-[calc(100vh-300px)] overflow-y-auto">
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
            {TIME_SLOTS.map((slotTime) => {
              const isCurrentSlot = isToday && slotTime === currentTimeSlot;
              return (
                <div
                  key={slotTime}
                  ref={isCurrentSlot ? currentTimeSlotRef : null}
                >
                  <TimeSlotRow
                    slotTime={slotTime}
                    appointments={filteredAppointments}
                    selectedDate={date || new Date()}
                    isCurrentSlot={isCurrentSlot}
                    checkingIn={checkingIn}
                    onCheckIn={onCheckIn}
                    onStartConsultation={onStartConsultation}
                    onCancelClick={onCancelClick}
                    onNoShowClick={onNoShowClick}
                    {...(userRole && { userRole: userRole })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
