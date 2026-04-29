"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { cn } from "@workspace/ui/lib/utils";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isLoading?: boolean;
  contentClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  isLoading,
  contentClassName,
  disabled = false,
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[600px]", contentClassName)}
        onInteractOutside={(e: Event) => {
          if (isLoading || disabled) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e: KeyboardEvent) => {
          if (isLoading || disabled) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  );
}

export interface FormDialogFooterProps {
  isLoading?: boolean;
  disabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  isEditing?: boolean;
  onCancel?: () => void;
}

export function FormDialogFooter({
  isLoading = false,
  disabled = false,
  submitLabel,
  cancelLabel = "Cancel",
  isEditing = false,
  onCancel,
}: FormDialogFooterProps) {
  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading || disabled}
      >
        {cancelLabel}
      </Button>
      <Button type="submit" disabled={isLoading || disabled}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {submitLabel || (isEditing ? "Updating..." : "Creating...")}
          </>
        ) : (
          submitLabel || (isEditing ? "Update" : "Create")
        )}
      </Button>
    </DialogFooter>
  );
}
