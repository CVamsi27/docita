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
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";

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
    const appointmentTypeLabel = apt.type
      ? humanizeUiLabel(apt.type)
      : "General";
    const canAccessConsultation =
      canStartConsultation &&
      !!currentUserId &&
      apt.doctorId === currentUserId;

    const isTerminalVisit =
      apt.status === "completed" || apt.status === "no-show";
    const isConsultationActive = apt.status === "in-progress";
    const consultationPrimaryLabel = isTerminalVisit
      ? "View"
      : isConsultationActive
        ? "Continue"
        : "Start";
    const consultationTitle = isTerminalVisit
      ? "View consultation record"
      : isConsultationActive
        ? "Continue consultation"
        : "Start consultation";

    return (
      <div className="group relative @container/apt overflow-hidden rounded-xl border border-border/60 bg-card/95 pl-3 pr-3 py-3 transition-colors duration-150 hover:border-border hover:bg-card">
        <div
          className={`absolute inset-y-0 left-0 w-1 ${
            apt.status === "checked-in"
              ? "bg-success"
              : apt.status === "confirmed"
                ? "bg-info"
                : apt.status === "in-progress"
                  ? "bg-primary"
                  : apt.status === "completed" || apt.status === "no-show"
                    ? "bg-muted-foreground/40"
                    : "bg-primary/60"
          }`}
          aria-hidden="true"
        />

        <div className="flex flex-col gap-3 pl-2 @md/apt:flex-row @md/apt:items-center @md/apt:justify-between @md/apt:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex shrink-0 flex-col items-start">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground tabular-nums">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {format(aptStart, "h:mm a")}
              </div>
              <span className="mt-0.5 pl-5 text-xs text-muted-foreground tabular-nums">
                {format(aptEnd, "h:mm a")}
              </span>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="truncate text-sm font-semibold text-foreground">
                  {apt.patient
                    ? `${apt.patient.firstName} ${apt.patient.lastName}`
                    : `Patient ID: ${apt.patientId}`}
                </h3>
                <Badge
                  variant="secondary"
                  className={`text-[var(--fs-2xs)] capitalize ${
                    apt.status === "confirmed"
                      ? "badge-info"
                      : apt.status === "checked-in"
                        ? "badge-success"
                        : apt.status === "in-progress"
                          ? "badge-info"
                          : "badge-muted"
                  }`}
                >
                  {humanizeUiLabel(apt.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {apt.patient ? "Linked patient" : "Unlinked patient"}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span>{format(aptStart, "EEE, MMM d")}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{appointmentTypeLabel}</span>
                {apt.doctor?.name && (
                  <>
                    <span aria-hidden="true">&middot;</span>
                    <span className="truncate">Dr. {apt.doctor.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 @md/apt:flex-nowrap @md/apt:justify-end">
            {apt.status === "confirmed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheckIn(apt.id!)}
                disabled={checkingIn === apt.id}
                className="h-8 gap-1.5 rounded-full px-3 text-xs"
                title="Check in patient"
              >
                {checkingIn === apt.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>Check-in</span>
              </Button>
            )}
            {apt.status === "checked-in" && (
              <Badge
                variant="secondary"
                className="badge-success h-8 gap-1 rounded-full px-3"
              >
                <Check className="h-3 w-3" />
                <span>In Queue</span>
              </Badge>
            )}
            {canAccessConsultation && (
              <Button
                size="sm"
                variant={isTerminalVisit ? "outline" : "default"}
                onClick={() => onStartConsultation(apt.id!)}
                disabled={startingConsultationId === apt.id}
                className="h-8 gap-1.5 rounded-full px-3 text-xs"
                title={consultationTitle}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>{consultationPrimaryLabel}</span>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 shrink-0 rounded-full p-0"
                  aria-label="More appointment actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
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
    );
  },
);

TimeSlotRow.displayName = "TimeSlotRow";
