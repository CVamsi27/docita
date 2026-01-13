
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { AlertOptions } from "../types";
import { getVariantStyles } from "../utils";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: AlertOptions | null;
  onConfirm: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  options,
  onConfirm,
}: AlertDialogProps) {
  if (!options) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {options.icon}
            {options.title}
          </DialogTitle>
          <DialogDescription>{options.description || ""}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={onConfirm}
            className={cn(getVariantStyles(options.variant))}
          >
            {options.confirmText || "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
