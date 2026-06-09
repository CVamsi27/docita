"use client";

// jscpd:ignore-start
import { Button } from "@workspace/ui/components/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { Textarea } from "@workspace/ui/components/form/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
// jscpd:ignore-end
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import type { JoinRequest } from "@/features/settings/components/management/join-requests-list.boundary";

export function JoinRequestReviewDialogs({
  selectedRequest,
  actionType,
  assignedRole,
  setAssignedRole,
  welcomeMessage,
  setWelcomeMessage,
  rejectionReason,
  setRejectionReason,
  isApproving,
  isRejecting,
  onClose,
  onApprove,
  onReject,
}: {
  selectedRequest: JoinRequest | null;
  actionType: "approve" | "reject" | null;
  assignedRole: string;
  setAssignedRole: (value: string) => void;
  welcomeMessage: string;
  setWelcomeMessage: (value: string) => void;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <>
      <Dialog
        open={actionType === "approve"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
            <DialogDescription>
              Approve {selectedRequest?.user.name} to join your facility
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned Role</label>
              <Select value={assignedRole} onValueChange={setAssignedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="NURSE">Nurse</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="ADMIN_DOCTOR">Admin Doctor</SelectItem>
                </SelectContent>
              </Select>
              <p className="ui-helper-text">
                {assignedRole !== selectedRequest?.requestedRole &&
                  `This differs from the requested role (${selectedRequest?.requestedRole})`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Welcome Message{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                placeholder="Enter welcome message"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="ui-helper-text text-right">
                {welcomeMessage.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isApproving}>
              Cancel
            </Button>
            <Button onClick={onApprove} disabled={isApproving}>
              {isApproving ? "Approving…" : "Approve Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={actionType === "reject"}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedRequest?.user.name}&apos;s
              request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <label className="text-sm font-medium">Reason for Rejection</label>
            <Textarea
              placeholder="Enter rejection reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="ui-helper-text text-right">
              {rejectionReason.length}/500
            </p>
            <p className="ui-helper-text">
              This reason will be sent to the applicant
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isRejecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? "Rejecting…" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
