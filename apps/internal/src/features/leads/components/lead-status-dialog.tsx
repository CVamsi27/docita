// check-as-cast-density: allow-file — narrowing the Select value (string)
// to the schema-backed FacilityLeadStatus enum.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@workspace/ui/components";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
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

  const handleSave = async () => {
    if (!lead) return;
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

  if (!lead) return null;

  const allowed = FACILITY_LEAD_TRANSITIONS[lead.status] ?? [];
  const currentLabel = LEAD_STATUS_LABELS[lead.status];

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Update lead status"
      description={`${lead.facilityName} (${currentLabel}) — ${lead.referrerName}`}
      isLoading={saving}
      disabled={saving}
      submitLabel="Save Changes"
      onSubmit={() => {
        void handleSave();
      }}
    >
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
    </CRUDDialog>
  );
}
