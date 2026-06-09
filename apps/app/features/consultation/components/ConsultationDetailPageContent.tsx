"use client";

import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import {
  useConsultationLeaveNavigation,
  type ConsultationSaveHandles,
} from "@/features/consultation/workspace/use-consultation-leave-navigation";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useSessionRecoveryRedirect } from "@/hooks/use-session-recovery-redirect";
import { useConsultationCompletion } from "./use-consultation-completion";
import { useConsultationMarkDone } from "./use-consultation-mark-done";
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
  const rawAppointmentId = params["id"];
  const appointmentId =
    typeof rawAppointmentId === "string" ? rawAppointmentId : "";
  const saveHandlesRef = useRef<ConsultationSaveHandles | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { state, handlers } = useConsultationLogic(appointmentId);

  const {
    appointmentData,
    loading,
    isError,
    isAccessDenied,
    clinic,
    fallbackRoute,
    appointmentError,
  } = state;

  const { handleBack, retry } = handlers;

  const isRecoveringSession = useSessionRecoveryRedirect({
    error: appointmentError,
    onRecovered: retry,
  });

  const {
    consultationReadOnly,
    canMarkDone,
    markDoneDisabledReason,
  } = useConsultationCompletion({ appointmentData });

  const { handleMarkDone, isMarkingDone } = useConsultationMarkDone({
    appointmentData,
    appointmentId,
    consultationReadOnly,
    canMarkDone,
    markDoneDisabledReason,
    saveHandlesRef,
    retry,
  });

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

  if (loading || isRecoveringSession) {
    return (
      <ConsultationLoadingPage isRecoveringSession={isRecoveringSession} />
    );
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
