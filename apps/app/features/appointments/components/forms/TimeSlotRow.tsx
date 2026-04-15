import { memo } from "react";
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
import { usePermissions } from "@/hooks/use-permissions";

interface TimeSlotRowProps {
  appointment: Appointment & { patient?: Patient };
  checkingIn: string | null;
  startingConsultationId: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  currentUserId?: string;
}

export const TimeSlotRow = memo<TimeSlotRowProps>(
  ({
    appointment: apt,
    checkingIn,
    startingConsultationId,
    onCheckIn,
    onStartConsultation,
    onCancelClick,
    onNoShowClick,
    currentUserId,
  }) => {
    const { canStartConsultation } = usePermissions();
    const aptStart = new Date(apt.startTime);
    const aptEnd = new Date(apt.endTime);
    const canAccessConsultation =
      canStartConsultation &&
      !!currentUserId &&
      apt.doctorId === currentUserId;

    return (
      <div
        className={`flex border-b transition-colors ${
          "border-border hover:bg-muted/30 dark:hover:bg-muted/10"
        } min-h-[60px]`}
      >
        <div className="flex-1 p-2">
          <div
            className={`flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-lg border transition-colors duration-150 ${
              apt.status === "checked-in"
                ? "surface-success"
                : apt.status === "confirmed"
                  ? "surface-info"
                  : apt.status === "completed"
                    ? "bg-muted/30 border-border"
                    : "bg-card border-border"
            }`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                {format(aptStart, "h:mm a")} - {format(aptEnd, "h:mm a")}
              </span>
              <div className="h-4 w-px bg-border mx-1" />
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm font-semibold truncate text-foreground">
                {apt.patient
                  ? `${apt.patient.firstName} ${apt.patient.lastName}`
                  : `Patient ID: ${apt.patientId}`}
              </span>
              <Badge
                variant={apt.status === "confirmed" ? "default" : "secondary"}
                className="text-xs shrink-0 capitalize"
              >
                {apt.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 ml-2 shrink-0">
              {apt.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCheckIn(apt.id!)}
                  disabled={checkingIn === apt.id}
                  className="gap-1 h-8 text-xs hover:bg-primary/10 dark:hover:bg-primary/20"
                  title="Check in patient"
                >
                  {checkingIn === apt.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Check-in</span>
                </Button>
              )}
              {apt.status === "checked-in" && (
                <Badge
                  variant="secondary"
                  className="gap-1 badge-success text-xs shrink-0"
                >
                  <Check className="h-3 w-3" />
                  <span className="hidden sm:inline">In Queue</span>
                </Badge>
              )}
              {canAccessConsultation && (
                <Button
                  size="sm"
                  variant={apt.status === "completed" ? "outline" : "default"}
                  onClick={() => onStartConsultation(apt.id!)}
                  disabled={startingConsultationId === apt.id}
                  className="h-8 text-xs gap-1"
                  title={
                    apt.status === "completed"
                      ? "View consultation"
                      : apt.status === "in-progress"
                        ? "Resume consultation"
                        : "Start consultation"
                  }
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {apt.status === "completed"
                      ? "View"
                      : apt.status === "in-progress"
                        ? "Resume"
                        : "Start"}
                  </span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
                  <DropdownMenuItem onClick={() => onNoShowClick(apt.id || "")}>
                    Mark as No Show
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

TimeSlotRow.displayName = "TimeSlotRow";
