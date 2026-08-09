"use client";

import { Send } from "lucide-react";
import { useClinicRecentSentMessages } from "@workspace/data-access";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { getClinicTimezoneOrDefault } from "@/lib/utils/clinic-timezone";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { formatDate } from "@/lib/formatters";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SENT: "default",
  DELIVERED: "secondary",
  READ: "secondary",
  QUEUED: "outline",
  FAILED: "destructive",
};

function formatRelativeTime(
  date: string | Date,
  timezone: string,
): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(then, undefined, timezone);
}

export function WhatsappRecentSentView() {
  const clinicTimezone = getClinicTimezoneOrDefault(useOptionalClinic()?.clinic);
  const messages = useClinicRecentSentMessages();

  if (messages.isLoading) {
    return <DataState status="loading" loadingMessage="Loading sent messages..." />;
  }

  if (messages.isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load sent messages."
        onRetry={() => void messages.refetch()}
      />
    );
  }

  if (!messages.data?.length) {
    return (
      <DataState
        status="empty"
        emptyIcon={Send}
        emptyTitle="No messages sent yet"
        emptyDescription="Outbound WhatsApp messages (reminders, invoices, prescriptions) will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {messages.data.map((msg) => (
        <Card key={msg.id}>
          <CardContent className="flex items-start gap-3 p-3">
            <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {msg.patientName ?? msg.phoneNumber}
                </span>
                <Badge variant={STATUS_BADGE_VARIANT[msg.status] ?? "outline"}>
                  {msg.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(msg.createdAt, clinicTimezone)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {msg.message}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {humanizeUiLabel(msg.type)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
