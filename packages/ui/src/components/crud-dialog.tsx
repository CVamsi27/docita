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
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("sm:max-w-[500px]", contentClassName)}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {children}

          <div className="flex justify-end gap-2 pt-4">
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
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {submitLabel || (isEditing ? "Updating..." : "Creating...")}
                </>
              ) : (
                submitLabel || (isEditing ? "Update" : "Create")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
