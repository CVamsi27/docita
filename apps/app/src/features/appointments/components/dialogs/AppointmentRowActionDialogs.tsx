import { CancelAppointmentDialog } from "./CancelAppointmentDialog";
import { ConfirmationDialog } from "@workspace/ui/components/overlay/confirmation-dialog";
import type { AppointmentRowActionDialogProps } from "../../hooks/use-appointment-row-actions";

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
