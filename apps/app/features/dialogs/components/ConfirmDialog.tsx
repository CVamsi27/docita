// jscpd:ignore-start
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { cn } from "@workspace/ui/lib/utils";
import { ConfirmOptions } from "@/features/dialogs/types";
import { getConfirmButtonVariant, getVariantStyles } from "@/features/dialogs/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
  typedConfirmation: string;
  setTypedConfirmation: (value: string) => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  options,
  onConfirm,
  onCancel,
  typedConfirmation,
  setTypedConfirmation,
}: ConfirmDialogProps) {
  if (!options) return null;

  const requiresTypedConfirmation = options.requireConfirmation;
  const confirmationMatches =
    !requiresTypedConfirmation ||
    typedConfirmation === requiresTypedConfirmation;

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

        {requiresTypedConfirmation && (
// jscpd:ignore-end
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Type <strong>{requiresTypedConfirmation}</strong> to confirm:
            </p>
            <Input
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={requiresTypedConfirmation}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {options.cancelText || "Cancel"}
          </Button>
          <Button
            variant={getConfirmButtonVariant(options.variant)}
            onClick={onConfirm}
            className={cn(getVariantStyles(options.variant))}
            disabled={!confirmationMatches}
          >
            {options.confirmText || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
