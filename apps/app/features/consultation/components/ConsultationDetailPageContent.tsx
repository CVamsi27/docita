"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import {
  useConsultationLeaveNavigation,
  type ConsultationSaveHandles,
} from "@/features/consultation/workspace/use-consultation-leave-navigation";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { consultationApi } from "@/features/consultation/api/consultation.api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import {
  canCompleteConsultation,
  getConsultationCompletionMissingFields,
} from "@/features/consultation/rules/consultationRules";
import { resolveConsultationCompletionSnapshot } from "@/features/consultation/rules/consultation-completion";
import { useSessionRecoveryRedirect } from "@/hooks/use-session-recovery-redirect";
import {
  ConsultationLoadingPage,
  ConsultationErrorPage,
  ConsultationAccessDeniedPage,
  ConsultationNotFoundPage,
  ConsultationMainContent,
} from "./ConsultationDetailPageSections";

export default function ConsultationPage() {
  return (
    <FeatureGate feature={Feature.CALENDAR_SLOTS} showLockedCard>
      <ConsultationPageContent />
    </FeatureGate>
  );
}

function ConsultationPageContent() {
  const params = useParams();
  const router = useRouter();
  const rawAppointmentId = params["id"];
  const appointmentId =
    typeof rawAppointmentId === "string" ? rawAppointmentId : "";
  const saveHandlesRef = useRef<ConsultationSaveHandles | null>(null);
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { state, handlers } = useConsultationLogic(appointmentId);

  const {
    appointmentData,
    loading,
    isError,
    isAccessDenied,
    clinic,
    isSidebarOpen,
    fallbackRoute,
    appointmentError,
  } = state;

  const { handleBack, toggleSidebar, retry } = handlers;

  const isRecoveringSession = useSessionRecoveryRedirect({
    error: appointmentError,
    onRecovered: retry,
  });

  const consultationReadOnly = appointmentData
    ? isConsultationReadOnlyStatus(appointmentData.status)
    : false;

  const draftChiefComplaint = useConsultationDraft((s) => s.chiefComplaint);
  const draftDiagnosis = useConsultationDraft((s) => s.diagnosis);

  const completionSnapshot = useMemo(() => {
    if (!appointmentData) {
      return null;
    }
    return resolveConsultationCompletionSnapshot(appointmentData, {
      chiefComplaint: draftChiefComplaint,
      diagnosis: draftDiagnosis,
    });
  }, [appointmentData, draftChiefComplaint, draftDiagnosis]);

  const completionMissingFields = useMemo(
    () =>
      completionSnapshot
        ? getConsultationCompletionMissingFields(completionSnapshot)
        : [],
    [completionSnapshot],
  );

  const canMarkDone =
    !consultationReadOnly &&
    Boolean(completionSnapshot && canCompleteConsultation(completionSnapshot));

  const markDoneDisabledReason =
    completionMissingFields.length > 0
      ? `Add ${completionMissingFields.join(", ")} before marking done`
      : undefined;

  const {
    tryNavigateAway,
    attemptNavigateToHref,
    leaveDialogOpen,
    onLeaveDialogOpenChange,
    leaveBusy,
    saveAndLeave,
    leaveWithoutSaving,
  } = useConsultationLeaveNavigation({
    readOnly: consultationReadOnly,
    fallbackRoute,
    saveHandlesRef,
    activeAppointmentId: appointmentId,
  });

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
  ]);

  if (loading || isRecoveringSession) {
    return <ConsultationLoadingPage isRecoveringSession={isRecoveringSession} />;
  }

  if (isError) {
    return <ConsultationErrorPage onRetry={retry} />;
  }

  if (isAccessDenied) {
    return <ConsultationAccessDeniedPage onBack={handleBack} />;
  }

  if (!appointmentData) {
    return <ConsultationNotFoundPage onBack={handleBack} />;
  }

  return (
    <ConsultationMainContent
      appointmentData={appointmentData}
      appointmentId={appointmentId}
      clinicType={clinic?.type}
      consultationReadOnly={consultationReadOnly}
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={toggleSidebar}
      saveHandlesRef={saveHandlesRef}
      paletteOpen={paletteOpen}
      onPaletteOpenChange={setPaletteOpen}
      onBack={tryNavigateAway}
      attemptNavigateToHref={attemptNavigateToHref}
      leaveDialogOpen={leaveDialogOpen}
      onLeaveDialogOpenChange={onLeaveDialogOpenChange}
      leaveBusy={leaveBusy}
      onSaveAndLeave={saveAndLeave}
      onLeaveWithoutSaving={leaveWithoutSaving}
      onMarkDone={handleMarkDone}
      isMarkingDone={isMarkingDone}
      canMarkDone={canMarkDone}
      markDoneDisabledReason={markDoneDisabledReason}
    />
  );
}
