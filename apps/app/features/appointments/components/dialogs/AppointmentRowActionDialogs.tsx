"use client";

import dynamicImport from "next/dynamic";
import type { AppointmentRowActionDialogProps } from "@/features/appointments/hooks/use-appointment-row-actions";

const CancelAppointmentDialog = dynamicImport(
  () =>
    import("./CancelAppointmentDialog").then((m) => ({
      default: m.CancelAppointmentDialog,
    })),
  { ssr: false },
);

const ConfirmationDialog = dynamicImport(
  () =>
    import("@workspace/ui/components/overlay/confirmation-dialog").then(
      (m) => ({
        default: m.ConfirmationDialog,
      }),
    ),
  { ssr: false },
);

/**
 * Shared mount point for the Cancel + Mark-as-No-Show dialogs that back the
 * row-level actions on both /appointments and /consultation. Driven entirely
 * by `useAppointmentRowActions().dialogProps` so each consumer page only has
 * to render this once.
 */
export function AppointmentRowActionDialogs({
  cancelDialogOpen,
  setCancelDialogOpen,
  noShowDialogOpen,
  setNoShowDialogOpen,
  isPending,
  onCancelConfirm,
  onNoShowConfirm,
}: AppointmentRowActionDialogProps) {
  return (
    <>
      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        isLoading={isPending}
        onConfirm={onCancelConfirm}
      />
      <ConfirmationDialog
        open={noShowDialogOpen}
        onOpenChange={setNoShowDialogOpen}
        title="Mark as No Show"
        description="Are you sure you want to mark this appointment as no-show?"
        confirmText="Mark as No Show"
        cancelText="Cancel"
        type="danger"
        isLoading={isPending}
        onConfirm={onNoShowConfirm}
      />
    </>
  );
}
