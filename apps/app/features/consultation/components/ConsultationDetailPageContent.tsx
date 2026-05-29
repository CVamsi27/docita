"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { ConsultationShell } from "@/features/consultation/workspace/ConsultationShell";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import { ConsultationPageHeaderUI } from "@/features/consultation/components/ConsultationPageHeaderUI";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import { ConsultationLeaveDialog } from "@/features/consultation/components/ConsultationLeaveDialog";
import { ConsultationVitalsProvider } from "@/features/consultation/workspace/consultation-vitals-context";
import { ConsultationLeaveNavigationProvider } from "@/features/consultation/workspace/consultation-leave-navigation-context";
import {
  useConsultationLeaveNavigation,
  type ConsultationSaveHandles,
} from "@/features/consultation/workspace/use-consultation-leave-navigation";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import { formatChiefComplaintSummary } from "@workspace/utils";
import { Stethoscope } from "lucide-react";
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
  } = state;

  const { handleBack, toggleSidebar, retry } = handlers;

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
      await queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all() });

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

  if (loading) {
    return (
      <AppPageScaffold>
        <DataState
          status="loading"
          className="min-h-[50vh]"
          loadingMessage="Loading consultation…"
        />
      </AppPageScaffold>
    );
  }

  if (isError) {
    return (
      <AppPageScaffold>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="We could not open this consultation. Please try again."
          onRetry={retry}
        />
      </AppPageScaffold>
    );
  }

  if (isAccessDenied) {
    return (
      <AppPageScaffold>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="Only the assigned doctor can open this consultation"
          onRetry={handleBack}
        />
      </AppPageScaffold>
    );
  }

  if (!appointmentData) {
    return (
      <AppPageScaffold>
        <DataState
          status="empty"
          className="min-h-[50vh]"
          emptyIcon={Stethoscope}
          emptyTitle="Appointment not found"
          emptyDescription="This consultation is unavailable or has been removed"
          emptyAction={{
            label: "Back to Appointments",
            onClick: handleBack,
          }}
        />
      </AppPageScaffold>
    );
  }

  const patientName = appointmentData.patient
    ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
    : "Patient";

  const MobileSidebar = (
    <ConsultationSidebarContainer appointmentData={appointmentData} />
  );

  return (
    <ConsultationVitalsProvider
      appointmentId={appointmentId}
      patientName={patientName}
    >
      <ConsultationLeaveNavigationProvider
        attemptNavigateToHref={attemptNavigateToHref}
      >
        <div className="flex h-full flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <ConsultationPageHeaderUI
              patientName={patientName}
              appointmentDate={appointmentData.startTime}
              appointmentId={appointmentId}
              patientId={appointmentData.patientId}
              appointmentType={appointmentData.type}
              appointmentStatus={appointmentData.status}
              readOnly={consultationReadOnly}
              chiefComplaint={
                formatChiefComplaintSummary(
                  appointmentData.chiefComplaint ?? undefined,
                ) ?? undefined
              }
              onBack={tryNavigateAway}
              MobileSidebarContent={MobileSidebar}
              isDesktopSidebarOpen={isSidebarOpen}
              onToggleDesktopSidebar={toggleSidebar}
              onOpenCommandPalette={() => setPaletteOpen(true)}
              onMarkDone={handleMarkDone}
              isMarkingDone={isMarkingDone}
              canMarkDone={canMarkDone}
              markDoneDisabledReason={markDoneDisabledReason}
            />

            <ConsultationShell
              appointmentData={appointmentData}
              clinicType={clinic?.type}
              readOnly={consultationReadOnly}
              isSidebarOpen={isSidebarOpen}
              saveHandlesRef={saveHandlesRef}
              paletteOpen={paletteOpen}
              onPaletteOpenChange={setPaletteOpen}
            />
          </div>
        </div>

        <ConsultationLeaveDialog
          open={leaveDialogOpen}
          onOpenChange={onLeaveDialogOpenChange}
          leaveBusy={leaveBusy}
          onSaveAndLeave={saveAndLeave}
          onLeaveWithoutSaving={leaveWithoutSaving}
        />
      </ConsultationLeaveNavigationProvider>
    </ConsultationVitalsProvider>
  );
}
