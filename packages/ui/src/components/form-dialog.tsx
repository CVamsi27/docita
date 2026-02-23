"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  isEditing?: boolean;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  contentClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onCancel?: () => void;
}

/**
 * FormDialog is a wrapper for react-hook-form dialogs.
 * Unlike CRUDDialog which manages form submission,
 * FormDialog only handles dialog state and rendering.
 * The actual form submission is handled by react-hook-form's handleSubmit.
 *
 * Usage with react-hook-form:
 * Pass the form element as children to FormDialog.
 * FormDialog will handle dialog state management.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  isEditing: _isEditing = false,
  isLoading,
  submitLabel: _submitLabel,
  cancelLabel: _cancelLabel = "Cancel",
  contentClassName,
  disabled = false,
  children,
  onCancel: _onCancel,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:max-w-[600px] max-h-[85vh] sm:max-h-[90vh]",
          contentClassName,
        )}
        onInteractOutside={(e: Event) => {
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

/**
 * FormDialogFooter - Use inside FormDialog for consistent footer styling.
 * Place this after your form element to render submit/cancel buttons.
 */
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
    <div className="flex justify-end gap-2 pt-4">
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
    </div>
  );
}
