import { Badge } from "@workspace/ui/components";
import type { FacilityLeadNotificationView } from "@workspace/types";

/**
 * Delivery status of the internal notification for a lead. QUEUED means the
 * outbox relay has not processed the event yet; DELIVERED/FAILED reflect the
 * listener outcome (FAILED rows carry the error in the dialog/queue detail).
 */
export function LeadNotificationBadge({
  notification,
}: {
  notification: FacilityLeadNotificationView | null;
}) {
  if (!notification) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (notification.status === "DELIVERED") {
    return <Badge variant="outline">Notified</Badge>;
  }
  if (notification.status === "FAILED") {
    return <Badge variant="destructive">Notify failed</Badge>;
  }
  return <Badge variant="secondary">Queued</Badge>;
}
