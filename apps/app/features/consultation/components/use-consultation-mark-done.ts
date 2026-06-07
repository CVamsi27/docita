"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import { useConfirm } from "@/hooks/use-confirm";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { consultationApi } from "@/features/consultation/api/consultation.api";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";
import type { AppointmentWithRelations } from "@workspace/data-access";

interface UseConsultationMarkDoneOptions {
  appointmentData?: AppointmentWithRelations | null;
  appointmentId: string;
  consultationReadOnly: boolean;
  canMarkDone: boolean;
  markDoneDisabledReason?: string;
  saveHandlesRef: React.RefObject<ConsultationSaveHandles | null>;
  retry: () => void;
}

export function useConsultationMarkDone({
  appointmentData,
  appointmentId,
  consultationReadOnly,
  canMarkDone,
  markDoneDisabledReason,
  saveHandlesRef,
  retry,
}: UseConsultationMarkDoneOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();
  const [isMarkingDone, setIsMarkingDone] = useState(false);

  const handleMarkDone = useCallback(async () => {
    if (!appointmentData) return;
    if (consultationReadOnly || isMarkingDone || !canMarkDone) {
      if (markDoneDisabledReason) {
        toast.message("Consultation is incomplete", {
          description: markDoneDisabledReason,
        });
      }
      return;
    }
    const ok = await confirmAction("mark consultation done", {
      title: "Mark consultation done?",
      description:
        "This will finalize the visit, lock the chart, and send the prescription and invoice to the patient on WhatsApp if available.",
      confirmText: "Mark done",
      variant: "warning",
    });
    if (!ok) return;
    setIsMarkingDone(true);
    try {
      const handles = saveHandlesRef.current;
      if (!handles) {
        showUserFacingErrorToast(
          "We could not finalize this consultation yet. Please wait a moment and try again.",
        );
        return;
      }

      const flushed = await handles.flush({ force: true });
      if (!flushed) {
        showUserFacingErrorToast(
          "We could not save the latest changes. Please resolve any errors and try again.",
          "save",
        );
        return;
      }

      const prescriptionsOk = await handles.submitPrescriptions();
      if (!prescriptionsOk) {
        toast.message("Prescription not finalized", {
          description:
            "We saved the consultation, but could not finalize the prescription. You can review it later from the patient chart.",
        });
      }
      await consultationApi.complete(appointmentId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointmentId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.all(),
      });

      toast.success("Consultation marked done");
      void retry();
      router.push("/consultation");
    } finally {
      setIsMarkingDone(false);
    }
  }, [
    appointmentData,
    appointmentId,
    canMarkDone,
    confirmAction,
    consultationReadOnly,
    isMarkingDone,
    markDoneDisabledReason,
    queryClient,
    router,
    retry,
    saveHandlesRef,
  ]);

  return { handleMarkDone, isMarkingDone };
}
