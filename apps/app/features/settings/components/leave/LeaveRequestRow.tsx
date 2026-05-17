"use client";

import { Check, X, Ban } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { formatDate } from "@workspace/utils";
import {
  useApproveLeave,
  useCancelLeave,
} from "@/hooks/api/use-leaves";
import type { StaffLeave } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { LEAVE_TYPE_LABELS } from "./LeaveBalanceCard";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export function LeaveRequestRow({
  leave,
  userIsAdmin,
  currentUserId,
  onActionDone,
  onReject,
}: {
  leave: StaffLeave;
  userIsAdmin: boolean;
  currentUserId?: string;
  onActionDone: () => void;
  onReject: (id: string) => void;
}) {
  const approveMutation = useApproveLeave(leave.id!);
  const cancelMutation = useCancelLeave(leave.id!);
  const isOwn = leave.staffId === currentUserId;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync();
      toast.success("Leave approved");
      onActionDone();
    } catch {
      showUserFacingErrorToast(
        "We could not approve this leave request. Please try again.",
      );
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync();
      toast.success("Leave cancelled");
      onActionDone();
    } catch {
      showUserFacingErrorToast(
        "We could not cancel this leave request. Please try again.",
      );
    }
  };

  return (
    <div className="flex items-start justify-between p-3 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        {userIsAdmin && leave.staff && (
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            {leave.staff.name}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {LEAVE_TYPE_LABELS[leave.leaveType]}
          </span>
          <Badge variant={STATUS_VARIANT[leave.status] ?? "secondary"}>
            {humanizeUiLabel(leave.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(leave.startDate as string, "MMM d, yyyy")} -{" "}
          {formatDate(leave.endDate as string, "MMM d, yyyy")}
        </p>
        {leave.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {leave.reason}
          </p>
        )}
        {leave.rejectionReason && (
          <p className="text-xs text-destructive mt-0.5">
            Rejected: {leave.rejectionReason}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 ml-2 shrink-0">
        {leave.status === "PENDING" && userIsAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  iconClassName="h-3 w-3"
                />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
              onClick={() => onReject(leave.id!)}
            >
              <X className="h-3 w-3" />
              Reject
            </Button>
          </>
        )}
        {(leave.status === "PENDING" || leave.status === "APPROVED") &&
          isOwn && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1 text-muted-foreground"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <DocitaLoadingIndicator
                  variant="inline"
                  decorative
                  iconClassName="h-3 w-3"
                />
              ) : (
                <Ban className="h-3 w-3" />
              )}
              Cancel
            </Button>
          )}
      </div>
    </div>
  );
}
