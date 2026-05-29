"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  formatDate,
  DATE_FORMATS,
  formatDistanceToNow,
} from "@workspace/utils";
import { MessageCircle } from "lucide-react";

type PatientResponseType =
  | "CONFIRM"
  | "ON_THE_WAY"
  | "DELAY"
  | "RESCHEDULE"
  | "CANCEL"
  | "UNKNOWN";

const RESPONSE_LABELS: Record<PatientResponseType, string> = {
  CONFIRM: "Confirmed via WhatsApp",
  ON_THE_WAY: "On the way (WhatsApp)",
  DELAY: "Running late (WhatsApp)",
  RESCHEDULE: "Asked to reschedule (WhatsApp)",
  CANCEL: "Cancelled via WhatsApp",
  UNKNOWN: "Replied on WhatsApp",
};

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

export function PatientWhatsAppResponseBadge({
  responseType,
  responseTime,
  delayMinutes,
  className,
}: PatientWhatsAppResponseBadgeProps) {
  const type = (responseType as PatientResponseType) in RESPONSE_LABELS
    ? (responseType as PatientResponseType)
    : "UNKNOWN";
  const label =
    type === "DELAY" && delayMinutes != null
      ? `Running ${delayMinutes} min late (WhatsApp)`
      : RESPONSE_LABELS[type];
  const variant = RESPONSE_VARIANT[type];

  const tooltip = responseTime
    ? `${label} · ${formatDate(responseTime, DATE_FORMATS.DATETIME_LONG)} (${formatDistanceToNow(responseTime)})`
    : label;

  return (
    <Badge
      variant={variant}
      className={`inline-flex items-center gap-1.5 text-[length:var(--fs-2xs)] ${className ?? ""}`}
      title={tooltip}
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
