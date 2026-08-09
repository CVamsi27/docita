import { Button, DialogFooter } from "@workspace/ui/components";

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
        {isSubmitting ? "Admitting…" : "Admit"}
      </Button>
    </DialogFooter>
  );
}
