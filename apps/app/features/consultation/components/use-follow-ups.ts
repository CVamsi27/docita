"use client";

import { toast } from "sonner";
import {
  useCancelFollowUp,
  useCompleteFollowUp,
  useFollowUps as useFollowUpsQuery,
} from "@workspace/data-access";
import { logger } from "@/lib/monitoring/logger";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { logPayloadFromError } from "./follow-up-helpers";

export function useFollowUps(appointmentId?: string) {
  const query = useFollowUpsQuery(appointmentId ? { appointmentId } : undefined);
  const completeFollowUp = useCompleteFollowUp();
  const cancelFollowUp = useCancelFollowUp();
  const pendingCompleteId = completeFollowUp.variables?.id ?? null;
  const pendingCancelId = cancelFollowUp.variables?.id ?? null;
  const actioning =
    completeFollowUp.isPending
      ? pendingCompleteId
      : cancelFollowUp.isPending
        ? pendingCancelId
        : null;

  const handleComplete = async (id: string) => {
    try {
      await completeFollowUp.mutateAsync({ id });
      toast.success("Follow-up marked complete");
    } catch (err) {
      logger.error("Failed to complete follow-up", logPayloadFromError(err));
      showUserFacingErrorToast(
        "We could not complete this follow-up. Please try again.",
      );
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelFollowUp.mutateAsync({ id });
      toast.success("Follow-up cancelled");
    } catch (err) {
      logger.error("Failed to cancel follow-up", logPayloadFromError(err));
      showUserFacingErrorToast(
        "We could not cancel this follow-up. Please try again.",
      );
    }
  };

  return {
    followUps: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    loadError: query.isError,
    actioning,
    handleComplete,
    handleCancel,
  };
}
