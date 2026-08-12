import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import {
  useCancelAppointment,
  useUpdateAppointment,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface UseAppointmentRowActionsOptions {
  /** Called after a successful cancel/no-show so the consumer can refetch its own list. */
  onMutated?: () => void | Promise<void>;
}

export interface AppointmentRowActionDialogProps {
  cancelDialogOpen: boolean;
  setCancelDialogOpen: (open: boolean) => void;
  noShowDialogOpen: boolean;
  setNoShowDialogOpen: (open: boolean) => void;
  isPending: boolean;
  onCancelConfirm: (reason: string) => Promise<void>;
  onNoShowConfirm: () => Promise<void>;
}

interface UseAppointmentRowActionsResult {
  onCancelClick: (appointmentId: string) => void;
  onNoShowClick: (appointmentId: string) => void;
  handleCancelAppointment: (reason: string) => Promise<void>;
  handleNoShowAppointment: () => Promise<void>;
  isPending: boolean;
  dialogProps: AppointmentRowActionDialogProps;
}

/**
 * Shared state + mutations behind the row-level "Cancel appointment" and
 * "Mark as No Show" actions used by both the appointments list and the
 * consultation dashboard. Both pages mount `<AppointmentRowActionDialogs>`
 * with the returned `dialogProps`.
 */
export const useAppointmentRowActions = ({
  onMutated,
}: UseAppointmentRowActionsOptions = {}): UseAppointmentRowActionsResult => {
  const queryClient = useQueryClient();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingAptId, setCancellingAptId] = useState<string | null>(null);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [noShowAptId, setNoShowAptId] = useState<string | null>(null);

  const cancelAppointmentMutation = useCancelAppointment(cancellingAptId ?? "");
  const updateAppointmentMutation = useUpdateAppointment(noShowAptId ?? "");

  const isPending =
    cancelAppointmentMutation.isPending || updateAppointmentMutation.isPending;

  const onCancelClick = useCallback((appointmentId: string) => {
    if (!appointmentId) return;
    setCancellingAptId(appointmentId);
    setCancelDialogOpen(true);
  }, []);

  const onNoShowClick = useCallback((appointmentId: string) => {
    if (!appointmentId) return;
    setNoShowAptId(appointmentId);
    setNoShowDialogOpen(true);
  }, []);

  const invalidateRowQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
  }, [queryClient]);

  const handleCancelAppointment = useCallback(
    async (reason: string) => {
      if (!cancellingAptId) return;
      try {
        await cancelAppointmentMutation.mutateAsync({ reason });
        toast.success("Appointment cancelled successfully");
        setCancellingAptId(null);
        setCancelDialogOpen(false);
        await invalidateRowQueries();
        await onMutated?.();
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not cancel this appointment. Please try again.",
          "save",
        );
      }
    },
    [
      cancelAppointmentMutation,
      cancellingAptId,
      invalidateRowQueries,
      onMutated,
    ],
  );

  const handleNoShowAppointment = useCallback(async () => {
    if (!noShowAptId) return;
    try {
      await updateAppointmentMutation.mutateAsync({ status: "no-show" });
      toast.success("Appointment marked no-show");
      setNoShowAptId(null);
      setNoShowDialogOpen(false);
      await invalidateRowQueries();
      await onMutated?.();
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not mark this appointment missed. Please try again.",
        "save",
      );
    }
  }, [invalidateRowQueries, noShowAptId, onMutated, updateAppointmentMutation]);

  return {
    onCancelClick,
    onNoShowClick,
    handleCancelAppointment,
    handleNoShowAppointment,
    isPending,
    dialogProps: {
      cancelDialogOpen,
      setCancelDialogOpen,
      noShowDialogOpen,
      setNoShowDialogOpen,
      isPending,
      onCancelConfirm: handleCancelAppointment,
      onNoShowConfirm: handleNoShowAppointment,
    },
  };
};
