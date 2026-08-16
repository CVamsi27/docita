import { useState } from "react";
import { Badge, Button } from "@workspace/ui/components";
import type { FacilityLeadNotificationView } from "@workspace/types";
import { apiPost } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface LeadNotificationBadgeProps {
  notification: FacilityLeadNotificationView | null;
  /** Fired after a successful acknowledgement so the queue can refetch. */
  onAcknowledged?: () => void;
}

/**
 * Delivery + acknowledgement status of the internal notification for a
 * lead. QUEUED means the outbox relay has not processed the event yet;
 * DELIVERED/FAILED reflect the listener outcome (FAILED rows carry the
 * error). A DELIVERED notification that has not been acknowledged shows a
 * "Mark seen" action; the first acknowledgement wins (server-side
 * idempotent) and the row then renders as Seen.
 */
export function LeadNotificationBadge({
  notification,
  onAcknowledged,
}: LeadNotificationBadgeProps) {
  const [acknowledging, setAcknowledging] = useState(false);

  if (!notification) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  if (notification.status === "FAILED") {
    return <Badge variant="destructive">Notify failed</Badge>;
  }

  if (notification.status !== "DELIVERED") {
    return <Badge variant="secondary">Queued</Badge>;
  }

  if (notification.acknowledgedAt) {
    return <Badge variant="success">Seen</Badge>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline">Notified</Badge>
      <Button
        variant="ghost"
        size="sm"
        disabled={acknowledging}
        onClick={() => {
          setAcknowledging(true);
          apiPost(
            `/api/internal/leads/${notification.leadId}/notification/ack`,
          )
            .then(() => onAcknowledged?.())
            .catch((error) => {
              showUserFacingErrorToast(
                error,
                "We could not mark this notification as seen. Please try again.",
              );
            })
            .finally(() => setAcknowledging(false));
        }}
      >
        Mark seen
      </Button>
    </div>
  );
}
