// jscpd:ignore-start
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea
} from "@workspace/ui/components";
import { toast } from "sonner";
import { useUpdateAppointment } from "@workspace/data-access";
import { StickyNote } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export interface ConsultationNotesModalProps extends Omit<
// jscpd:ignore-end
  ModalProps,
  "onSaved"
> {
  onSaved?: () => Promise<void>;
}

export function ConsultationNotesModal({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}: ConsultationNotesModalProps) {
  const [notes, setNotes] = useState("");
  const updateAppointment = useUpdateAppointment(appointmentId || "");
  const handleSave = async () => {
    if (!appointmentId) return;
    try {
      await updateAppointment.mutateAsync({ notes });
      toast.success("Notes saved");
      if (onSaved) await onSaved();
      onOpenChange?.(false);
      setNotes("");
    } catch {
      showUserFacingErrorToast(
        "We could not save these notes. Please try again.",
      );
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-warning" />
            Add Clinical Notes
          </DialogTitle>
          {patientName && (
            <DialogDescription>Notes for {patientName}.</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex flex-col gap-2 min-w-0">
          <Label htmlFor="consultation-notes">Observations</Label>
          <Textarea
            id="consultation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Consultation notes"
            className="min-h-[160px] sm:min-h-[220px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!notes.trim() || updateAppointment.isPending}
          >
            {updateAppointment.isPending ? "Saving…" : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
