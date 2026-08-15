import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@workspace/ui/components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { FACILITY_LEAD_TRANSITIONS, type FacilityLeadStatus, type FacilityLeadView } from "@workspace/types";
import { apiPatch } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { LEAD_STATUS_LABELS } from "../lib/lead-status-labels";

interface LeadStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: FacilityLeadView | null;
  onSaved: () => void;
}

/**
 * Operator transition dialog. The target options come from the shared
 * `FACILITY_LEAD_TRANSITIONS` map (same single source the API enforces),
 * so an operator can never pick an edge the server would reject; a reason
 * is required and appended to the lead's history with actor + timestamp.
 */
export function LeadStatusDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
}: LeadStatusDialogProps) {
  const [target, setTarget] = useState<FacilityLeadStatus | "">("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset transient state on open so a previous close never leaks into the
  // next transition.
  useEffect(() => {
    if (open) {
      setTarget("");
      setReason("");
      setReasonError(null);
    }
  }, [open]);

  if (!lead) return null;

  const allowed = FACILITY_LEAD_TRANSITIONS[lead.status] ?? [];
  const currentLabel = LEAD_STATUS_LABELS[lead.status];

  const handleSave = async () => {
    if (!target) {
      setReasonError("Choose a target status");
      return;
    }
    if (reason.trim().length < 3) {
      setReasonError("Add a short reason for this change");
      return;
    }
    setReasonError(null);
    setSaving(true);
    try {
      await apiPatch(`/api/internal/leads/${lead.id}/status`, {
        status: target,
        reason: reason.trim(),
      });
      onOpenChange(false);
      onSaved();
      toast.success("Lead status updated");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not update this lead right now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update lead status</DialogTitle>
          <DialogDescription>
            {lead.facilityName} ({currentLabel}) — {lead.referrerName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New status *</Label>
            <Select
              value={target}
              onValueChange={(value) => {
                setTarget(value as FacilityLeadStatus);
                setReasonError(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {allowed.map((status) => (
                  <SelectItem key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(null);
              }}
              placeholder="Why is this lead moving to this state?"
              rows={3}
              aria-invalid={Boolean(reasonError)}
            />
            {reasonError && (
              <p className="text-sm text-destructive">{reasonError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
