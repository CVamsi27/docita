import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { CRUDDialog } from "@workspace/ui/components/overlay/crud-dialog";
import type { InternalFacilityLeadView, InternalOperator } from "@workspace/types";
import { apiGet, apiPatch } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface LeadAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: InternalFacilityLeadView | null;
  onSaved: () => void;
}

/**
 * Assigns (or re-assigns) the internal operator who owns a lead. The picker
 * lists Role.INTERNAL users from `GET /internal/operators`; the server
 * re-validates the role and records the change in the lead's audit history.
 */
export function LeadAssignDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
}: LeadAssignDialogProps) {
  const [operators, setOperators] = useState<InternalOperator[]>([]);
  const [ownerId, setOwnerId] = useState<string | "">("");
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOwnerId(lead?.ownerUserId ?? "");
    setOwnerError(null);
    setLoadingOperators(true);
    apiGet<InternalOperator[]>("/api/internal/operators")
      .then((data) => setOperators(data))
      .catch((error) => {
        showUserFacingErrorToast(
          error,
          "We could not load the operator list right now. Please try again.",
        );
      })
      .finally(() => setLoadingOperators(false));
  }, [open, lead]);

  const handleSave = async () => {
    if (!lead) return;
    if (!ownerId) {
      setOwnerError("Choose an operator");
      return;
    }
    setOwnerError(null);
    setSaving(true);
    try {
      await apiPatch(`/api/internal/leads/${lead.id}/assign`, {
        userId: ownerId,
      });
      onOpenChange(false);
      onSaved();
      toast.success("Lead owner updated");
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not update the lead owner right now. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <CRUDDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign lead owner"
      description={`${lead.facilityName} — ${lead.referrerName}`}
      isLoading={saving || loadingOperators}
      disabled={saving || loadingOperators}
      submitLabel="Save Changes"
      onSubmit={() => {
        void handleSave();
      }}
    >
      <div className="space-y-2">
        <Label>Owner</Label>
        <Select
          value={ownerId}
          onValueChange={(value) => {
            setOwnerId(value);
            setOwnerError(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an operator" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((operator) => (
              <SelectItem key={operator.id} value={operator.id}>
                {operator.name}
                <span className="ml-1 text-muted-foreground">
                  {operator.email}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ownerError && (
          <p className="text-sm text-destructive">{ownerError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The assigned operator is notified for this lead; every assignment is
          recorded in the audit history.
        </p>
      </div>
    </CRUDDialog>
  );
}
