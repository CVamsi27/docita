import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { memo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatClockTime } from "@/lib/formatters";
import { Check, Play, UserCheck } from "lucide-react";
import type { AppointmentListItem } from "@/hooks/api/use-appointments";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { usePermissions } from "@/hooks/use-permissions";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { AppointmentRowActionsMenu } from "./AppointmentRowActionsMenu";
import { WhatsAppDeliveryBadge } from "@/features/_shared/components/whatsapp/whatsapp-delivery-badge";
import { useResendAppointmentReminder } from "@/hooks/api/use-whatsapp";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface TimeSlotRowProps {
  appointment: AppointmentListItem;
  checkingIn: string | null;
  startingConsultationId: string | null;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  onScheduleFollowUp?: (appointment: AppointmentListItem) => void;
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
    onScheduleFollowUp,
    currentUserId,
  }) => {
    const { canStartConsultation } = usePermissions();
    const aptStart = new Date(apt.startTime);
    const aptEnd = new Date(apt.endTime);
    const appointmentTypeLabel = apt.type ? humanizeUiLabel(apt.type) : "General";
    const canAccessConsultation =
      canStartConsultation && !!currentUserId && apt.doctorId === currentUserId;

    const isTerminalVisit = apt.status === "completed" || apt.status === "no-show";
    const isConsultationActive = apt.status === "in-progress";
    const consultationPrimaryLabel = isTerminalVisit ? "View" : isConsultationActive ? "Resume" : "Start";
    const consultationTitle = isTerminalVisit
      ? "View consultation record"
      : isConsultationActive
        ? "Resume consultation"
        : "Start consultation";

    const patientName = apt.patient
      ? `${apt.patient.firstName} ${apt.patient.lastName}`.trim()
      : null;
    const phone = apt.patient?.phoneNumber?.trim() || null;

    const statusBadgeClass =
      apt.status === "confirmed"
        ? "badge-info"
        : apt.status === "checked-in" || apt.status === "in-progress"
          ? "badge-success"
          : apt.status === "completed"
            ? "badge-muted"
            : "badge-muted";

    const handleScheduleFollowUp = useCallback(() => {
      onScheduleFollowUp?.(apt);
    }, [apt, onScheduleFollowUp]);

    const queryClient = useQueryClient();
    const resendReminder = useResendAppointmentReminder();
    const lastReminder = apt.reminders?.[0] ?? null;

    const handleReminderRetry = useCallback(async () => {
      if (!apt.id) return;
      try {
        await resendReminder.mutateAsync({ appointmentId: apt.id });
        toast.success("Reminder re-sent on WhatsApp");
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      } catch (err) {
        showUserFacingErrorToast(
          err,
          "We could not resend the reminder. Please try again.",
          "save",
        );
      }
    }, [apt.id, resendReminder, queryClient]);

    return (
      <div className="group relative @container/apt overflow-hidden rounded-lg border border-border/60 bg-card/95 pl-3 pr-3 py-2.5 transition-colors duration-150 hover:border-border hover:bg-card">
        <div
          className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${
            apt.status === "checked-in"
              ? "bg-success"
              : apt.status === "confirmed"
                ? "bg-info"
                : apt.status === "in-progress"
                  ? "bg-primary"
                  : apt.status === "completed" || apt.status === "no-show"
                    ? "bg-muted-foreground/30"
                    : "bg-border"
          }`}
          aria-hidden="true"
        />

        <div className="flex flex-col gap-2 pl-2 @md/apt:flex-row @md/apt:items-center @md/apt:justify-between @md/apt:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Time range */}
            <div className="shrink-0 text-right">
              <p className="text-[length:var(--fs-sm)] font-semibold tabular-nums text-foreground">
                {formatClockTime(aptStart)}
              </p>
              <p className="text-[length:var(--fs-xs)] tabular-nums text-muted-foreground">
                {formatClockTime(aptEnd)}
              </p>
            </div>

            {/* Patient + meta */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="truncate text-[length:var(--fs-sm)] font-semibold text-foreground">
                  {patientName ?? apt.patientId}
                </span>
                {phone ? (
                  <span className="text-[length:var(--fs-xs)] tabular-nums text-muted-foreground">
                    {phone}
                  </span>
                ) : null}
                <Badge
                  variant="secondary"
                  className={`text-[length:var(--fs-2xs)] capitalize ${statusBadgeClass}`}
                >
                  {humanizeUiLabel(apt.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0 text-[length:var(--fs-xs)] text-muted-foreground">
                {apt.reason?.trim() ? (
                  <>
                    <span className="line-clamp-1 min-w-0">{apt.reason}</span>
                    <span aria-hidden="true">·</span>
                  </>
                ) : null}
                <span>{appointmentTypeLabel}</span>
                {apt.doctor?.name ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">Dr. {apt.doctor.name}</span>
                  </>
                ) : null}
              </div>
              {lastReminder ? (
                <div className="mt-1">
                  <WhatsAppDeliveryBadge
                    status={lastReminder.status}
                    sentAt={lastReminder.sentAt ?? null}
                    onRetry={handleReminderRetry}
                    isRetrying={resendReminder.isPending}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 @md/apt:flex-nowrap @md/apt:justify-end">
            {apt.status === "confirmed" && (
              <SymbolTooltip label="Check in patient">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCheckIn(apt.id!)}
                  disabled={checkingIn === apt.id}
                  className="h-7 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
                >
                  {checkingIn === apt.id ? (
                    <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-3 w-3" />
                  ) : (
                    <UserCheck className="h-3 w-3" />
                  )}
                  Check-in
                </Button>
              </SymbolTooltip>
            )}
            {apt.status === "checked-in" && (
              <Badge variant="secondary" className="badge-success h-7 gap-1 rounded-full px-3 text-[length:var(--fs-xs)]">
                <Check className="h-3 w-3" />
                In Queue
              </Badge>
            )}
            {canAccessConsultation && (
              <SymbolTooltip label={consultationTitle}>
                <Button
                  size="sm"
                  variant={isTerminalVisit ? "outline" : "default"}
                  onClick={() => onStartConsultation(apt.id!)}
                  disabled={startingConsultationId === apt.id}
                  className="h-7 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
                >
                  {startingConsultationId === apt.id ? (
                    <DocitaLoadingIndicator variant="inline" decorative iconClassName="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {consultationPrimaryLabel}
                </Button>
              </SymbolTooltip>
            )}
            <AppointmentRowActionsMenu
              appointmentId={apt.id ?? null}
              patientId={apt.patientId ?? null}
              status={apt.status}
              onCancelClick={onCancelClick}
              onNoShowClick={onNoShowClick}
              onScheduleFollowUp={
                onScheduleFollowUp ? handleScheduleFollowUp : undefined
              }
            />
          </div>
        </div>
      </div>
    );
  },
);

TimeSlotRow.displayName = "TimeSlotRow";
