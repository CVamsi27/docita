"use client";

import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useRejectLeave } from "@/hooks/api/use-leaves";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

function RejectButton({
  leaveId,
  reason,
  onDone,
}: {
  leaveId: string;
  reason: string;
  onDone: () => void;
}) {
  const rejectMutation = useRejectLeave(leaveId);

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ rejectionReason: reason });
      toast.success("Leave rejected");
      onDone();
    } catch {
      showUserFacingErrorToast(
        "We could not reject this leave request. Please try again.",
      );
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleReject}
      disabled={rejectMutation.isPending}
    >
      {rejectMutation.isPending && (
        <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
      )}
      Reject Leave
    </Button>
  );
}

export function RejectLeaveDialog({
  open,
  onOpenChange,
  leaveId,
  rejectionReason,
  onReasonChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveId: string | null;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Leave Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Reason for rejection</Label>
          <Textarea
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter rejection reason"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {leaveId ? (
            <RejectButton
              leaveId={leaveId}
              reason={rejectionReason}
              onDone={onDone}
            />
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
