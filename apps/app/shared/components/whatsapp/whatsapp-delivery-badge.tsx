"use client";

import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { Check, CheckCheck, Clock, RefreshCw, Send, X } from "lucide-react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  formatDate,
  DATE_FORMATS,
  formatDistanceToNow,
} from "@workspace/utils";

type DeliveryState =
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "pending"
  | "unknown";

function normalizeStatus(status: string | null | undefined): DeliveryState {
  if (!status) return "unknown";
  const lower = status.toLowerCase();
  if (lower === "sent") return "sent";
  if (lower === "delivered") return "delivered";
  if (lower === "read") return "read";
  if (lower === "failed") return "failed";
  if (lower === "pending" || lower === "queued") return "pending";
  return "unknown";
}

const STATE_CONFIG: Record<
  DeliveryState,
  {
    label: string;
    variant: "default" | "secondary" | "destructive";
    icon: typeof Send;
  }
> = {
  pending: { label: "Queued", variant: "secondary", icon: Clock },
  sent: { label: "Sent", variant: "secondary", icon: Send },
  delivered: { label: "Delivered", variant: "default", icon: Check },
  read: { label: "Read", variant: "default", icon: CheckCheck },
  failed: { label: "Failed", variant: "destructive", icon: X },
  unknown: { label: "Not sent", variant: "secondary", icon: Send },
};

export interface WhatsAppDeliveryBadgeProps {
  status: string | null | undefined;
  sentAt?: string | Date | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function WhatsAppDeliveryBadge({
  status,
  sentAt,
  onRetry,
  isRetrying = false,
  className,
}: WhatsAppDeliveryBadgeProps) {
  const state = normalizeStatus(status);
  const config = STATE_CONFIG[state];
  const Icon = config.icon;

  const tooltip = sentAt
    ? `WhatsApp ${config.label.toLowerCase()} · ${formatDate(
        sentAt,
        DATE_FORMATS.DATETIME_LONG,
      )} (${formatDistanceToNow(sentAt)})`
    : `WhatsApp ${config.label.toLowerCase()}`;

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Badge
        variant={config.variant}
        className="inline-flex items-center gap-1.5"
        title={tooltip}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        WhatsApp · {config.label}
      </Badge>
      {state === "failed" && onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-1.5"
        >
          {isRetrying ? (
            <DocitaLoadingIndicator variant="inline" decorative />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Retry
        </Button>
      ) : null}
    </div>
  );
}
