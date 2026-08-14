import { Button } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { ConfirmVariant } from "./types";
import { getConfirmButtonVariant, getVariantStyles } from "./utils";

interface DialogActionButtonsProps {
  cancelText?: string;
  confirmText: string;
  variant?: ConfirmVariant;
  onCancel?: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

/** Outline cancel + primary confirm button pair shared by confirm and prompt dialogs. */
export function DialogActionButtons({
  cancelText,
  confirmText,
  variant,
  onCancel,
  onConfirm,
  confirmDisabled,
}: DialogActionButtonsProps) {
  return (
    <>
      {onCancel && (
        <Button variant="outline" onClick={onCancel}>
          {cancelText || "Cancel"}
        </Button>
      )}
      <Button
        variant={getConfirmButtonVariant(variant)}
        onClick={onConfirm}
        className={cn(getVariantStyles(variant))}
        disabled={confirmDisabled}
      >
        {confirmText}
      </Button>
    </>
  );
}
