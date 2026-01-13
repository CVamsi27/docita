import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";

export interface DiscardChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DiscardChangesDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: DiscardChangesDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogDescription>
          You have unsaved changes. Are you sure you want to leave without
          saving?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Keep Editing
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Discard Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
