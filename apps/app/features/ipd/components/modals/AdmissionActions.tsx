import {
  DialogFooter,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";

interface AdmissionActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function AdmissionActions({ isSubmitting, onCancel, onSubmit }: AdmissionActionsProps) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Admitting\u2026" : "Admit"}
      </Button>
    </DialogFooter>
  );
}
