import { Button } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { AlertOptions } from "./types";
import { DialogShell } from "./dialog-shell";
import { getConfirmButtonVariant, getVariantStyles } from "./utils";

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
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={options.title}
      description={options.description}
      icon={options.icon}
      footer={
        <Button
          variant={getConfirmButtonVariant(options.variant)}
          onClick={onConfirm}
          className={cn(getVariantStyles(options.variant))}
        >
          {options.confirmText || "OK"}
        </Button>
      }
    />
  );
}
