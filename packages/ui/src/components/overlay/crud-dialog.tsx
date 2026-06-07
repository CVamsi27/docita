"use client";

import * as React from "react";
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
import { cn } from "@workspace/ui/lib/utils";
import {
  preventEscapeWhenLoadingOrDisabled,
  preventWhenLoadingOrDisabled,
} from "./dialog-utils";

export interface CRUDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  isEditing?: boolean;
  isLoading?: boolean;
  onSubmit?: (e: React.FormEvent) => Promise<void> | void;
  submitLabel?: string;
  cancelLabel?: string;
  contentClassName?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function CRUDDialog({
  open,
  onOpenChange,
  title,
  description,
  isEditing = false,
  isLoading = false,
  onSubmit,
  submitLabel,
  cancelLabel = "Cancel",
  contentClassName,
  disabled = false,
  children,
}: CRUDDialogProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || disabled) return;
    try {
      if (onSubmit) {
        await onSubmit(e);
      }
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[500px]", contentClassName)}
        onInteractOutside={preventWhenLoadingOrDisabled(isLoading, disabled)}
        onEscapeKeyDown={preventEscapeWhenLoadingOrDisabled(
          isLoading,
          disabled,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-4 min-w-0">{children}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || disabled}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isLoading || disabled}>
              {isLoading ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  {submitLabel || (isEditing ? "Updating…" : "Creating…")}
                </>
              ) : (
                submitLabel || (isEditing ? "Update" : "Create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
