import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { HeartPulse } from "lucide-react";
import { useVitalsForm } from "./use-vitals-form";
import { VitalsFieldGrid } from "./VitalsModalSections";


interface VitalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  patientName?: string;
  onSaved?: () => void;
}

export function VitalsModal({
  open,
  onOpenChange,
  appointmentId,
  patientName,
  onSaved,
}: VitalsModalProps) {
  const { vitals, updateVital, handleSave, isSaving } = useVitalsForm({
    appointmentId,
    onSaved,
    onOpenChange,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-destructive" />
            Record Vitals
          </DialogTitle>
          {patientName && (
            <DialogDescription>
              Capture baseline measurements for {patientName}.
            </DialogDescription>
          )}
        </DialogHeader>

        <VitalsFieldGrid vitals={vitals} onFieldChange={updateVital} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Vitals"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
