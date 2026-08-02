import { getPatientFullName } from "@workspace/utils";
import { memo, useCallback } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AppointmentListItem } from "@workspace/data-access";
import { queryKeys, useResendAppointmentReminder } from "@workspace/data-access";
import { usePermissions } from "@/hooks/use-permissions";
import { useDownloadOpdSlip } from "@/features/appointments/hooks/use-download-opd-slip";
import { canStartConsultationAtTime } from "@/features/appointments/rules/appointment-rules";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { TimeSlotStatus, TimeSlotLabel, TimeSlotPatientInfo, TimeSlotActions } from "./TimeSlotRowSections";

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
    const navigate = useNavigate();
    const { download: downloadOpdSlip, downloadingId: opdSlipDownloadingId } =
      useDownloadOpdSlip();
    const queryClient = useQueryClient();
    const resendReminder = useResendAppointmentReminder();

    const aptId = apt.id;
    const isTerminalVisit =
      apt.status === "completed" || apt.status === "no-show";
    const isConsultationActive = apt.status === "in-progress";
    const consultationPrimaryLabel = isTerminalVisit
      ? "View"
      : isConsultationActive
        ? "Resume"
        : "Start";
    const consultationTitle = isTerminalVisit
      ? "View consultation record"
      : isConsultationActive
        ? "Resume consultation"
        : "Start consultation";

    // A future scheduled appointment must not expose Start/Resume; the doctor
    // can only begin a consultation once the visit's start time has arrived.
    // Terminal visits (completed/no-show) are always viewable — the time gate
    // is irrelevant because the consultation record already exists.
    const isStartableByTime = isTerminalVisit || canStartConsultationAtTime(apt);
    const canAccessConsultation =
      canStartConsultation &&
      isStartableByTime &&
      (isAdmin || (!!currentUserId && apt.doctorId === currentUserId));

    const patientName = apt.patient
      ? getPatientFullName(apt.patient).trim()
      : null;
    const phone = apt.patient?.phoneNumber?.trim() || null;

    const lastReminder = apt.reminders?.[0] ?? null;
    const latestPatientResponse = apt.latestPatientResponse ?? null;

    const handleOpenPatient = useCallback(() => {
      if (apt.patientId) {
        navigate(`/patients/${apt.patientId}`);
      }
    }, [apt.patientId, navigate]);

    const handleRowKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenPatient();
        }
      },
      [handleOpenPatient],
    );

    const stopRowActivation = useCallback((event: React.SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    const handleScheduleFollowUp = useCallback(() => {
      onScheduleFollowUp?.(apt);
    }, [apt, onScheduleFollowUp]);

    const handleReminderRetry = useCallback(async () => {
      if (!apt.id) return;
      try {
        await resendReminder.mutateAsync({ appointmentId: apt.id });
        toast.success("Reminder re-sent on WhatsApp");
        await queryClient.invalidateQueries({
          queryKey: queryKeys.appointments.all(),
        });
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
        <TimeSlotStatus status={apt.status} />
        <div className="flex flex-col gap-2 pl-2 @md/apt:flex-row @md/apt:items-center @md/apt:justify-between @md/apt:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TimeSlotLabel
              startTime={apt.startTime}
              endTime={apt.endTime}
            />
            <TimeSlotPatientInfo
              patientName={patientName}
              patientId={apt.patientId}
              status={apt.status}
              type={apt.type}
              phone={phone}
              reason={apt.reason}
              doctorName={apt.doctor?.name}
              latestPatientResponse={latestPatientResponse}
              lastReminder={lastReminder}
              onReminderRetry={handleReminderRetry}
              isRetryingReminder={resendReminder.isPending}
              onStopPropagation={stopRowActivation}
            />
          </div>
          <TimeSlotActions
            appointmentId={aptId}
            patientId={apt.patientId}
            status={apt.status}
            checkingIn={checkingIn}
            startingConsultationId={startingConsultationId}
            canAccessConsultation={canAccessConsultation}
            consultationTitle={consultationTitle}
            consultationPrimaryLabel={consultationPrimaryLabel}
            isTerminalVisit={isTerminalVisit}
            onCheckIn={onCheckIn}
            onStartConsultation={onStartConsultation}
            onCancelClick={onCancelClick}
            onNoShowClick={onNoShowClick}
            onScheduleFollowUp={
              onScheduleFollowUp ? handleScheduleFollowUp : undefined
            }
            onPrintOpdSlip={
              aptId ? () => downloadOpdSlip(aptId) : undefined
            }
            printingOpdSlip={
              Boolean(aptId) && opdSlipDownloadingId === aptId
            }
            onStopPropagation={stopRowActivation}
          />
        </div>
      </div>
    );
  },
);

TimeSlotRow.displayName = "TimeSlotRow";
