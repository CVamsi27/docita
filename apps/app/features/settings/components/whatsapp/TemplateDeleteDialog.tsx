"use client";

import type { ClinicWhatsappTemplate } from "@workspace/types";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";

interface TemplateDeleteDialogProps {
  pendingDelete: ClinicWhatsappTemplate | null;
  isLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function TemplateDeleteDialog({
  pendingDelete,
  isLoading,
  onOpenChange,
  onConfirm,
}: TemplateDeleteDialogProps) {
  return (
    <ConfirmationDialog
      open={pendingDelete !== null}
      onOpenChange={onOpenChange}
      title="Delete template?"
      description={
        pendingDelete
          ? `"${pendingDelete.name}" will no longer be available in the patient composer.`
          : undefined
      }
      confirmText="Delete"
      type="danger"
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
