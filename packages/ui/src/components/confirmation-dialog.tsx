"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";

export type ConfirmationType = "danger" | "warning" | "info" | "success";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  type?: ConfirmationType;
  isLoading?: boolean;
  disabled?: boolean;
}

const iconMap = {
  danger: <XCircle className="h-5 w-5 text-destructive" />,
  warning: (
    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
  ),
  info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  success: (
    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
  ),
};

const buttonVariantMap = {
  danger: "destructive" as const,
  warning: "default" as const,
  info: "default" as const,
  success: "default" as const,
};

/**
 * ConfirmationDialog is a specialized dialog for confirming user actions.
 * Use this for actions that need explicit confirmation before proceeding.
 *
 * @example
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   type="danger"
 *   title="Delete Item?"
 *   description="This action cannot be undone."
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   onConfirm={() => handleDelete()}
 * />
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  type = "info",
  isLoading = false,
  disabled = false,
}: ConfirmationDialogProps) {
  const [isPending, setIsPending] = React.useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const isLoading_ = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {iconMap[type]}
            <div className="flex-1">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-2">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading_ || disabled}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariantMap[type]}
            onClick={handleConfirm}
            disabled={isLoading_ || disabled}
            className="gap-2"
          >
            {isLoading_ && <span className="animate-spin">⟳</span>}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
