"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

import { DocitaLoadingIndicator } from "../feedback/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "../form/button";

export type ConfirmationType = "danger" | "warning" | "info" | "success";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  type?: ConfirmationType;
  isLoading?: boolean;
  disabled?: boolean;
}

const iconMap = {
  danger: <XCircle className="h-5 w-5 text-destructive" />,
  warning: <AlertCircle className="h-5 w-5 text-warning" />,
  info: <Info className="h-5 w-5 text-info" />,
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
};

const buttonVariantMap = {
  danger: "destructive" as const,
  warning: "default" as const,
  info: "default" as const,
  success: "default" as const,
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
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
      <DialogContent
        className="sm:max-w-[440px]"
        role={type === "danger" ? "alertdialog" : undefined}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">{iconMap[type]}</span>
            <div className="flex-1 flex flex-col gap-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
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
            {isLoading_ ? (
              <DocitaLoadingIndicator variant="inline" decorative />
            ) : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
