import { useTranslation } from "react-i18next";
import { Badge, SymbolTooltip } from "@workspace/ui/components";
import { formatDate, DATE_FORMATS, formatDistanceToNow } from "@workspace/utils";
import { MessageCircle } from "lucide-react";
import {
  patientResponseLabel,
  type PatientResponseType,
} from "./patient-response-label";

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

const RESPONSE_TYPES: ReadonlySet<string> = new Set([
  "CONFIRM",
  "ON_THE_WAY",
  "DELAY",
  "RESCHEDULE",
  "CANCEL",
  "UNKNOWN",
]);

interface PatientWhatsAppResponseBadgeProps {
  responseType: string;
  responseTime?: string | Date | null;
  delayMinutes?: number | null;
  className?: string;
}

function isPatientResponseType(value: string): value is PatientResponseType {
  return RESPONSE_TYPES.has(value);
}

export function PatientWhatsAppResponseBadge({
  responseType,
  responseTime,
  delayMinutes,
  className,
}: PatientWhatsAppResponseBadgeProps) {
  const { t } = useTranslation("Appointments");
  const type = isPatientResponseType(responseType) ? responseType : "UNKNOWN";
  const label = patientResponseLabel(type, delayMinutes, t);
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
