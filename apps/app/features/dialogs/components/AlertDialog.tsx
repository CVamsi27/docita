// jscpd:ignore-start
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { AlertOptions } from "@/features/dialogs/types";
import { getConfirmButtonVariant, getVariantStyles } from "@/features/dialogs/utils";

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
{/* jscpd:ignore-end */}
          <Button
            variant={getConfirmButtonVariant(options.variant)}
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
