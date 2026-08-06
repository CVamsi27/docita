import { Input } from "@workspace/ui/components";
import type { ConfirmOptions } from "./types";
import { DialogActionButtons } from "./dialog-action-buttons";
import { DialogShell } from "./dialog-shell";

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
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={options.title}
      description={options.description}
      icon={options.icon}
      footer={
        <DialogActionButtons
          cancelText={options.cancelText}
          confirmText={options.confirmText || "Confirm"}
          variant={options.variant}
          onCancel={onCancel}
          onConfirm={onConfirm}
          confirmDisabled={!confirmationMatches}
        />
      }
    >
      {requiresTypedConfirmation && (
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
    </DialogShell>
  );
}
