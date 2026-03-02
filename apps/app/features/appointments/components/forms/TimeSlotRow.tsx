import { memo, useMemo } from "react";
import { format } from "date-fns";
import {
  Check,
  Clock,
  ExternalLink,
  Loader2,
  MoreVertical,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { Appointment, Patient } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { TIME_SLOTS } from "@/features/appointments/hooks/use-appointments-logic";
import { usePermissions } from "@/hooks/use-permissions";

const isAppointmentInSlot = (
  appointment: Appointment,
  slotTime: string,
  selectedDate: Date,
) => {
  const [slotHour, slotMinute] = slotTime.split(":").map(Number);
  const slotStart = new Date(selectedDate);
  slotStart.setHours(slotHour, slotMinute, 0, 0);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  const aptStart = new Date(appointment.startTime);
  const aptEnd = new Date(appointment.endTime);

  return aptStart < slotEnd && aptEnd > slotStart;
};

interface TimeSlotRowProps {
  slotTime: string;
  appointments: (Appointment & { patient?: Patient })[];
  selectedDate: Date;
  isCurrentSlot: boolean;
  checkingIn: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  userRole?: string;
}

export const TimeSlotRow = memo<TimeSlotRowProps>(
  ({
    slotTime,
    appointments,
    selectedDate,
    isCurrentSlot,
    checkingIn,
    onCheckIn,
    onStartConsultation,
    onCancelClick,
    onNoShowClick,

    userRole: _userRole,
  }) => {
    const slotAppointments = useMemo(
      () =>
        appointments.filter((apt) =>
          isAppointmentInSlot(apt, slotTime, selectedDate),
        ),
      [appointments, slotTime, selectedDate],
    );
    const { canStartConsultation } = usePermissions();

    return (
      <div
        className={`flex border-b transition-colors ${
          isCurrentSlot
            ? "bg-primary/10 dark:bg-primary/5 border-l-4 border-l-primary shadow-sm"
            : "border-border hover:bg-muted/30 dark:hover:bg-muted/10"
        } min-h-[60px]`}
      >
        <div
          className={`w-20 shrink-0 p-3 text-sm font-semibold border-r border-border transition-colors ${
            isCurrentSlot
              ? "text-primary bg-primary/5 dark:bg-primary/10"
              : "text-muted-foreground"
          }`}
        >
          {slotTime}
        </div>
        <div className="flex-1 p-2 relative">
          {slotAppointments.length > 0 ? (
            <div className="space-y-1.5">
              {slotAppointments.map((apt) => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                const isFirstSlot =
                  isAppointmentInSlot(apt, slotTime, selectedDate) &&
                  (TIME_SLOTS.indexOf(slotTime) === 0 ||
                    !isAppointmentInSlot(
                      apt,
                      TIME_SLOTS[TIME_SLOTS.indexOf(slotTime) - 1] || "",
                      selectedDate,
                    ));

                return (
                  <div
                    key={apt.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md ${
                      apt.status === "checked-in"
                        ? "surface-success shadow-sm"
                        : apt.status === "confirmed"
                          ? "surface-info shadow-sm"
                          : apt.status === "completed"
                            ? "bg-muted/30 border-border"
                            : "bg-card border-border shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isFirstSlot && (
                        <>
                          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-xs font-semibold text-foreground">
                            {format(aptStart, "h:mm a")} -{" "}
                            {format(aptEnd, "h:mm a")}
                          </span>
                          <div className="h-4 w-px bg-border mx-1" />
                        </>
                      )}
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-semibold truncate text-foreground">
                        {apt.patient
                          ? `${apt.patient.firstName} ${apt.patient.lastName}`
                          : `Patient ID: ${apt.patientId}`}
                      </span>
                      <Badge
                        variant={
                          apt.status === "confirmed" ? "default" : "secondary"
                        }
                        className="text-xs shrink-0 capitalize"
                      >
                        {apt.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      {apt.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onCheckIn(apt.id!)}
                          disabled={checkingIn === apt.id}
                          className="gap-1 h-8 text-xs hover:bg-primary/10 dark:hover:bg-primary/20"
                        >
                          {checkingIn === apt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          Check-in
                        </Button>
                      )}
                      {apt.status === "checked-in" && (
                        <Badge
                          variant="secondary"
                          className="gap-1 badge-success text-xs"
                        >
                          <Check className="h-3 w-3" />
                          In Queue
                        </Badge>
                      )}
                      {canStartConsultation && (
                        <Button
                          size="sm"
                          variant={
                            apt.status === "completed" ? "outline" : "default"
                          }
                          onClick={() => onStartConsultation(apt.id!)}
                          className="h-8 text-xs"
                        >
                          <Stethoscope className="mr-1 h-3.5 w-3.5" />
                          {apt.status === "completed" ? "View" : "Start"}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/patients/${apt.patientId}`}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Patient
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onCancelClick(apt.id || "")}
                            className="text-destructive focus:text-destructive"
                          >
                            Cancel Appointment
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onNoShowClick(apt.id || "")}
                          >
                            Mark as No Show
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

TimeSlotRow.displayName = "TimeSlotRow";
