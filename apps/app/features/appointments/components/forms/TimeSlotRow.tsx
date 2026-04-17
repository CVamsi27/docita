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
import { toTitleCase } from "@/lib/formatters";

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
      ? toTitleCase(apt.type.replaceAll("_", " "))
      : "General";
    const canAccessConsultation =
      canStartConsultation &&
      !!currentUserId &&
      apt.doctorId === currentUserId;

    return (
      <div
        className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          apt.status === "checked-in"
            ? "surface-success ring-1 ring-success/15"
            : apt.status === "confirmed"
              ? "surface-info ring-1 ring-info/15"
              : apt.status === "completed"
                ? "ring-1 ring-muted/30"
                : ""
        }`}
      >
        <div
          className={`absolute inset-y-0 left-0 w-1.5 ${
            apt.status === "checked-in"
              ? "bg-success"
              : apt.status === "confirmed"
                ? "bg-info"
                : apt.status === "completed"
                  ? "bg-muted-foreground/40"
                  : "bg-primary/40"
          }`}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3 pl-1">
            <div className="shrink-0 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {format(aptStart, "h:mm a")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(aptEnd, "h:mm a")}
              </p>
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-foreground">
                  {apt.patient
                    ? `${apt.patient.firstName} ${apt.patient.lastName}`
                    : `Patient ID: ${apt.patientId}`}
                </h3>
                <Badge
                  variant={apt.status === "confirmed" ? "default" : "secondary"}
                  className={`text-xs capitalize ${
                    apt.status === "confirmed"
                      ? "badge-info"
                      : apt.status === "checked-in"
                        ? "badge-success"
                        : "badge-muted"
                  }`}
                >
                  {apt.status.replace("-", " ")}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {apt.patient ? "Linked patient" : "Unlinked patient"}
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{format(aptStart, "EEE, MMM d")}</span>
                <span className="hidden sm:inline">•</span>
                <span>{appointmentTypeLabel}</span>
                {apt.doctor?.name && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span>Dr. {apt.doctor.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pl-1 sm:justify-end sm:pl-0">
            {apt.status === "confirmed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCheckIn(apt.id!)}
                disabled={checkingIn === apt.id}
                className="gap-1.5 rounded-full px-3 text-xs hover:bg-primary/10 dark:hover:bg-primary/20"
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
                className="badge-success gap-1 rounded-full"
              >
                <Check className="h-3 w-3" />
                <span>In Queue</span>
              </Badge>
            )}
            {canAccessConsultation && (
              <Button
                size="sm"
                variant={apt.status === "completed" ? "outline" : "default"}
                onClick={() => onStartConsultation(apt.id!)}
                disabled={startingConsultationId === apt.id}
                className="gap-1.5 rounded-full px-3 text-xs"
                title={
                  apt.status === "completed"
                    ? "View consultation"
                    : apt.status === "in-progress"
                      ? "Resume consultation"
                      : "Start consultation"
                }
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 shrink-0 rounded-full p-0"
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
