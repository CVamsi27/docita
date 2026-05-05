"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { DataState } from "@workspace/ui/components/data-state";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
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
import { isConsultationReadOnlyStatus } from "@/features/appointments/rules/appointmentRules";
import { formatChiefComplaintSummary } from "@workspace/utils";
import { Stethoscope } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { consultationApi } from "@/features/consultation/api/consultation.api";
import { useQueryClient } from "@tanstack/react-query";
import { useSendPrescriptionWhatsApp } from "@/hooks/api/use-whatsapp";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { Feature } from "@workspace/types";

export default function ConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params["id"] as string;
  const saveHandlesRef = useRef<ConsultationSaveHandles | null>(null);
  const queryClient = useQueryClient();
  const { confirmAction } = useConfirm();
  const sendPrescription = useSendPrescriptionWhatsApp();
  const canAccess = usePermissionStore((s) => s.canAccess);
  const [isMarkingDone, setIsMarkingDone] = useState(false);

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
    if (consultationReadOnly || isMarkingDone) return;
    const ok = await confirmAction("mark consultation done", {
      title: "Mark consultation done?",
      description:
        "This will finalize the visit, lock the chart, and attempt to send the prescription to the patient.",
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
      const refreshed = await consultationApi.getByAppointmentId(appointmentId);

      await queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId],
      });
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });

      const prescriptionId = refreshed.prescription?.id;
      const canSendWhatsApp = canAccess(Feature.WHATSAPP_MESSAGING);
      if (prescriptionId && canSendWhatsApp) {
        try {
          await sendPrescription.mutateAsync({ id: prescriptionId });
        } catch (err) {
          showUserFacingErrorToast(
            err,
            "Consultation marked done, but we could not send the prescription message. You can resend it from the patient chart.",
            "save",
          );
        }
      }

      toast.success("Consultation marked as done");
      void retry();
      router.push("/consultation");
    } finally {
      setIsMarkingDone(false);
    }
  }, [
    appointmentData,
    appointmentId,
    canAccess,
    confirmAction,
    consultationReadOnly,
    isMarkingDone,
    queryClient,
    router,
    retry,
    sendPrescription,
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
            />

            <ConsultationShell
              appointmentData={appointmentData}
              clinicType={clinic?.type}
              readOnly={consultationReadOnly}
              isSidebarOpen={isSidebarOpen}
              saveHandlesRef={saveHandlesRef}
              onMarkDone={handleMarkDone}
              isMarkingDone={isMarkingDone}
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
