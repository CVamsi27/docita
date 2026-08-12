import { Badge } from "@workspace/ui/components/indicators/badge";
import type { AppointmentRequestResponse } from "@workspace/types";
import { formatDistanceToNow } from "@workspace/utils";
import { patientName } from "./requests/request-row-helpers";

export function AppointmentRequestPastRow({
  request,
}: {
  request: AppointmentRequestResponse;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[length:var(--fs-sm)] font-medium">
              {patientName(request)}
            </span>
            <Badge
              variant={request.status === "APPROVED" ? "default" : "secondary"}
              className="h-5 px-2 text-[length:var(--fs-2xs)]"
            >
              {request.status === "APPROVED" ? "Approved" : "Rejected"}
            </Badge>
          </div>
          <div className="mt-1 text-[length:var(--fs-xs)] text-muted-foreground">
            {request.responseMessage ?? request.reason ?? "Action recorded"}
          </div>
        </div>
        <div className="text-right text-[length:var(--fs-xs)] text-muted-foreground">
          {formatDistanceToNow(request.reviewedAt ?? request.updatedAt)}
        </div>
      </div>
    </div>
  );
}
