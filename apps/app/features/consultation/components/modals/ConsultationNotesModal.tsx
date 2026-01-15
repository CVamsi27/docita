import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { useUpdateAppointment } from "@/hooks/api/use-appointments";
import { StickyNote } from "lucide-react";
import { ModalProps } from "./PrescriptionModal";

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
        id: appointmentId,
        notes,
      });
      toast.success("Notes saved");
      if (onSaved) await onSaved();
      onOpenChange?.(false);
      setNotes("");
    } catch (error) {
      toast.error("Failed to save notes");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-amber-500" />
            Add Clinical Notes
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Notes for {patientName}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter clinical observations, diagnosis, and plan..."
              className="min-h-[200px]"
            />
          </div>
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
