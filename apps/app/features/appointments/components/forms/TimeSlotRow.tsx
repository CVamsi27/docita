import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatClockTime } from "@/lib/formatters";
import { Check, Play, UserCheck } from "lucide-react";
import { queryKeys, type AppointmentListItem } from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { usePermissions } from "@/hooks/use-permissions";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { AppointmentRowActionsMenu } from "./AppointmentRowActionsMenu";
import { WhatsAppDeliveryBadge } from "@/components/whatsapp/whatsapp-delivery-badge";
import { PatientWhatsAppResponseBadge } from "@/components/whatsapp/patient-whatsapp-response-badge";
import { useResendAppointmentReminder } from "@workspace/data-access";
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
    const { canStartConsultation, isAdmin } = usePermissions();
    const router = useRouter();
    const aptStart = new Date(apt.startTime);
    const aptEnd = new Date(apt.endTime);
    const appointmentTypeLabel = apt.type ? humanizeUiLabel(apt.type) : "General";
    // Doctors can only open their own consultations; admin-doctors (who have
    // both startConsultation + manageClinic) can open any.
    const canAccessConsultation =
      canStartConsultation &&
      (isAdmin || (!!currentUserId && apt.doctorId === currentUserId));

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

    const handleOpenPatient = useCallback(() => {
      if (apt.patientId) {
        router.push(`/patients/${apt.patientId}`);
      }
    }, [apt.patientId, router]);

    const handleRowKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenPatient();
        }
      },
      [handleOpenPatient],
    );

    const stopRowActivation = useCallback(
      (event: React.SyntheticEvent) => {
        event.stopPropagation();
      },
      [],
    );

    const queryClient = useQueryClient();
    const resendReminder = useResendAppointmentReminder();
    const lastReminder = apt.reminders?.[0] ?? null;
    const latestPatientResponse = apt.latestPatientResponse ?? null;

    const handleReminderRetry = useCallback(async () => {
      if (!apt.id) return;
      try {
        await resendReminder.mutateAsync({ appointmentId: apt.id });
        toast.success("Reminder re-sent on WhatsApp");
        await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });
      } catch (err) {
        showUserFacingErrorToast(
          err,
          "We could not resend the reminder. Please try again.",
          "save",
        );
      }
    }, [apt.id, resendReminder, queryClient]);

    const rowInteractive = Boolean(apt.patientId);

    return (
      <div
        className={`group relative @container/apt overflow-hidden rounded-lg border border-border/60 bg-card/95 pl-3 pr-3 py-2.5 transition-colors duration-150 hover:border-border hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
          rowInteractive ? "cursor-pointer" : ""
        }`}
        role={rowInteractive ? "button" : undefined}
        tabIndex={rowInteractive ? 0 : undefined}
        aria-label={
          rowInteractive && patientName
            ? `Open ${patientName}'s patient history`
            : undefined
        }
        onClick={rowInteractive ? handleOpenPatient : undefined}
        onKeyDown={rowInteractive ? handleRowKeyDown : undefined}
      >
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
            {/* Time range — primary anchor */}
            <div className="shrink-0 text-right tabular-nums">
              <p className="text-[length:var(--fs-sm)] font-semibold text-foreground leading-tight">
                {formatClockTime(aptStart)}
              </p>
              <p className="text-[length:var(--fs-2xs)] text-muted-foreground leading-tight">
                {formatClockTime(aptEnd)}
              </p>
            </div>

            {/* Patient + meta — single muted line beneath name */}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[length:var(--fs-sm)] font-semibold text-foreground">
                  {patientName ?? apt.patientId}
                </span>
                <Badge
                  variant="secondary"
                  className={`shrink-0 text-[length:var(--fs-2xs)] capitalize ${statusBadgeClass}`}
                >
                  {humanizeUiLabel(apt.status)}
                </Badge>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-[length:var(--fs-xs)] text-muted-foreground">
                <span className="truncate">
                  {[
                    apt.reason?.trim() || appointmentTypeLabel,
                    apt.doctor?.name ? `Dr. ${apt.doctor.name}` : null,
                    phone,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {(latestPatientResponse || lastReminder) ? (
                <div
                  className="mt-1 flex flex-wrap items-center gap-2"
                  onClick={stopRowActivation}
                >
                  {latestPatientResponse ? (
                    <PatientWhatsAppResponseBadge
                      responseType={latestPatientResponse.responseType}
                      responseTime={latestPatientResponse.responseTime}
                      delayMinutes={latestPatientResponse.delayMinutes}
                    />
                  ) : null}
                  {lastReminder ? (
                    <WhatsAppDeliveryBadge
                      status={lastReminder.status}
                      sentAt={lastReminder.sentAt ?? null}
                      onRetry={handleReminderRetry}
                      isRetrying={resendReminder.isPending}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5 @md/apt:flex-nowrap @md/apt:justify-end"
            onClick={stopRowActivation}
            onKeyDown={stopRowActivation}
          >
            {apt.status === "confirmed" && (
              <SymbolTooltip label="Check in patient">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (apt.id) onCheckIn(apt.id);
                  }}
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
                  onClick={() => {
                    if (apt.id) onStartConsultation(apt.id);
                  }}
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
