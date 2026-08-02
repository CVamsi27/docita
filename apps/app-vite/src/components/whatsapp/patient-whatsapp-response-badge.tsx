import { Badge, SymbolTooltip } from "@workspace/ui/components";
import { formatDate, DATE_FORMATS, formatDistanceToNow } from "@workspace/utils";
import { MessageCircle } from "lucide-react";

type PatientResponseType =
  | "CONFIRM"
  | "ON_THE_WAY"
  | "DELAY"
  | "RESCHEDULE"
  | "CANCEL"
  | "UNKNOWN";

const RESPONSE_LABELS = {
  CONFIRM: "Confirmed via WhatsApp",
  ON_THE_WAY: "On the way (WhatsApp)",
  DELAY: "Running late (WhatsApp)",
  RESCHEDULE: "Asked to reschedule (WhatsApp)",
  CANCEL: "Cancelled via WhatsApp",
  UNKNOWN: "Replied on WhatsApp",
} satisfies Record<PatientResponseType, string>;

const RESPONSE_VARIANT: Record<
  PatientResponseType,
  "default" | "secondary" | "destructive"
> = {
  CONFIRM: "default",
  ON_THE_WAY: "default",
  DELAY: "secondary",
  RESCHEDULE: "secondary",
  CANCEL: "destructive",
  UNKNOWN: "secondary",
};

export interface PatientWhatsAppResponseBadgeProps {
  responseType: string;
  responseTime?: string | Date | null;
  delayMinutes?: number | null;
  className?: string;
}

function isPatientResponseType(value: string): value is PatientResponseType {
  return Object.prototype.hasOwnProperty.call(RESPONSE_LABELS, value);
}

export function PatientWhatsAppResponseBadge({
  responseType,
  responseTime,
  delayMinutes,
  className,
}: PatientWhatsAppResponseBadgeProps) {
  const type = isPatientResponseType(responseType) ? responseType : "UNKNOWN";
  const label =
    type === "DELAY" && delayMinutes != null
      ? `Running ${delayMinutes} min late (WhatsApp)`
      : RESPONSE_LABELS[type];
  const variant = RESPONSE_VARIANT[type];

  const tooltip = responseTime
    ? `${label} · ${formatDate(responseTime, DATE_FORMATS.DATETIME_LONG)} (${formatDistanceToNow(responseTime)})`
    : label;

  return (
    <SymbolTooltip label={tooltip}>
      <Badge
        variant={variant}
        className={`inline-flex items-center gap-1.5 text-[length:var(--fs-2xs)] ${className ?? ""}`}
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        {label}
      </Badge>
    </SymbolTooltip>
  );
}
