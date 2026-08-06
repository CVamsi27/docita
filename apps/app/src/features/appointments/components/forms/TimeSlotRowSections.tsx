import { memo } from "react";
import { Check, Play, UserCheck } from "lucide-react";
import { formatClockTime } from "@/lib/formatters";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import type { AppointmentListItem } from "@workspace/data-access";
import { Badge, Button, SymbolTooltip } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { WhatsAppDeliveryBadge } from "@/components/whatsapp/whatsapp-delivery-badge";
import { PatientWhatsAppResponseBadge } from "@/components/whatsapp/patient-whatsapp-response-badge";
import { AppointmentRowActionsMenu } from "./AppointmentRowActionsMenu";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusBarColor(status: AppointmentListItem["status"]): string {
  if (status === "checked-in") return "bg-success";
  if (status === "confirmed") return "bg-info";
  if (status === "in-progress") return "bg-primary";
  if (status === "completed" || status === "no-show")
    return "bg-muted-foreground/30";
  return "bg-border";
}

function getStatusBadgeClass(status: AppointmentListItem["status"]): string {
  if (status === "confirmed") return "badge-info";
  if (status === "checked-in" || status === "in-progress") return "badge-success";
  return "badge-muted";
}

// ─── TimeSlotStatus ─────────────────────────────────────────────────────────

interface TimeSlotStatusProps {
  status: AppointmentListItem["status"];
}

export const TimeSlotStatus = memo<TimeSlotStatusProps>(({ status }) => (
  <div
    className={`absolute inset-y-0 left-0 w-1 rounded-l-lg ${getStatusBarColor(status)}`}
    aria-hidden="true"
  />
));
TimeSlotStatus.displayName = "TimeSlotStatus";

// ─── TimeSlotLabel ──────────────────────────────────────────────────────────

interface TimeSlotLabelProps {
  startTime: string | Date;
  endTime: string | Date;
}

export const TimeSlotLabel = memo<TimeSlotLabelProps>(
  ({ startTime, endTime }) => (
    <div className="shrink-0 text-right tabular-nums">
      <p className="text-[length:var(--fs-sm)] font-semibold text-foreground leading-tight">
        {formatClockTime(new Date(startTime))}
      </p>
      <p className="text-[length:var(--fs-2xs)] text-muted-foreground leading-tight">
        {formatClockTime(new Date(endTime))}
      </p>
    </div>
  ),
);
TimeSlotLabel.displayName = "TimeSlotLabel";

// ─── TimeSlotPatientInfo ────────────────────────────────────────────────────

interface TimeSlotPatientInfoProps {
  patientName: string | null;
  patientId: string | null;
  status: AppointmentListItem["status"];
  type: AppointmentListItem["type"];
  phone: string | null;
  reason: AppointmentListItem["reason"];
  doctorName: string | null | undefined;
  latestPatientResponse: AppointmentListItem["latestPatientResponse"] | null;
  lastReminder: NonNullable<AppointmentListItem["reminders"]>[number] | null;
  onReminderRetry: () => void;
  isRetryingReminder: boolean;
  onStopPropagation: (e: React.SyntheticEvent) => void;
}
export const TimeSlotPatientInfo = memo<TimeSlotPatientInfoProps>(
  ({
    patientName,
    patientId,
    status,
    type,
    phone,
    reason,
    doctorName,
    latestPatientResponse,
    lastReminder,
    onReminderRetry,
    isRetryingReminder,
    onStopPropagation,
  }) => {
    const appointmentTypeLabel = type
      ? humanizeUiLabel(type)
      : "General";
    const metaParts = [reason?.trim() || appointmentTypeLabel];
    if (doctorName) metaParts.push(`Dr. ${doctorName}`);
    if (phone) metaParts.push(phone);
    const metaLine = metaParts.join(" · ");
    return (
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[length:var(--fs-sm)] font-semibold text-foreground">
            {patientName ?? patientId}
          </span>
          <Badge
            variant="secondary"
            className={`shrink-0 text-[length:var(--fs-2xs)] capitalize ${getStatusBadgeClass(status)}`}
          >
            {humanizeUiLabel(status)}
          </Badge>
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-x-1.5 text-[length:var(--fs-xs)] text-muted-foreground">
          <span className="truncate">{metaLine}</span>
        </div>
        {latestPatientResponse || lastReminder ? (
          <div
            className="mt-1 flex flex-wrap items-center gap-2"
            onClick={onStopPropagation}
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
                onRetry={onReminderRetry}
                isRetrying={isRetryingReminder}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
);
TimeSlotPatientInfo.displayName = "TimeSlotPatientInfo";

// ─── TimeSlotActions ────────────────────────────────────────────────────────

interface TimeSlotActionsProps {
  appointmentId: string;
  patientId: string | null;
  status: AppointmentListItem["status"];
  checkingIn: string | null;
  startingConsultationId: string | null;
  canAccessConsultation: boolean;
  consultationTitle: string;
  consultationPrimaryLabel: string;
  isTerminalVisit: boolean;
  onCheckIn: (id: string) => void;
  onStartConsultation: (id: string) => void;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  onScheduleFollowUp?: () => void;
  onPrintOpdSlip?: () => void;
  printingOpdSlip: boolean;
  onStopPropagation: (e: React.SyntheticEvent) => void;
}

export const TimeSlotActions = memo<TimeSlotActionsProps>(
  ({
    appointmentId,
    patientId,
    status,
    checkingIn,
    startingConsultationId,
    canAccessConsultation,
    consultationTitle,
    consultationPrimaryLabel,
    isTerminalVisit,
    onCheckIn,
    onStartConsultation,
    onCancelClick,
    onNoShowClick,
    onScheduleFollowUp,
    onPrintOpdSlip,
    printingOpdSlip,
    onStopPropagation,
  }) => (
    <div
      className="flex flex-wrap items-center gap-1.5 @md/apt:flex-nowrap @md/apt:justify-end"
      onClick={onStopPropagation}
      onKeyDown={onStopPropagation}
    >
      {status === "confirmed" && (
        <SymbolTooltip label="Check in patient">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheckIn(appointmentId)}
            disabled={checkingIn === appointmentId}
            className="h-7 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
          >
            {checkingIn === appointmentId ? (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                iconClassName="h-3 w-3"
              />
            ) : (
              <UserCheck className="h-3 w-3" />
            )}
            Check-in
          </Button>
        </SymbolTooltip>
      )}
      {status === "checked-in" && (
        <Badge
          variant="secondary"
          className="badge-success h-7 gap-1 rounded-full px-3 text-[length:var(--fs-xs)]"
        >
          <Check className="h-3 w-3" />
          In Queue
        </Badge>
      )}
      {canAccessConsultation && (
        <SymbolTooltip label={consultationTitle}>
          <Button
            size="sm"
            variant={isTerminalVisit ? "outline" : "default"}
            onClick={() => onStartConsultation(appointmentId)}
            disabled={startingConsultationId === appointmentId}
            className="h-7 gap-1.5 rounded-full px-3 text-[length:var(--fs-xs)]"
          >
            {startingConsultationId === appointmentId ? (
              <DocitaLoadingIndicator
                variant="inline"
                decorative
                iconClassName="h-3 w-3"
              />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {consultationPrimaryLabel}
          </Button>
        </SymbolTooltip>
      )}
      <AppointmentRowActionsMenu
        appointmentId={appointmentId}
        patientId={patientId}
        status={status}
        onCancelClick={onCancelClick}
        onNoShowClick={onNoShowClick}
        onScheduleFollowUp={onScheduleFollowUp}
        onPrintOpdSlip={onPrintOpdSlip}
        printingOpdSlip={printingOpdSlip}
      />
    </div>
  ),
);
TimeSlotActions.displayName = "TimeSlotActions";
