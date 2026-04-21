import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { useUpdateAppointment } from "@/hooks/api/use-appointments";
import { StickyNote } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export interface ConsultationNotesModalProps extends Omit<
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
      await updateAppointment.mutateAsync({
        notes,
      });
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
            placeholder="Clinical observations, diagnosis, and plan..."
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
            {updateAppointment.isPending ? "Saving..." : "Save Notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
