"use client";

import { useParams } from "next/navigation";
import { useRef } from "react";
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
import { Stethoscope } from "lucide-react";

export default function ConsultationPage() {
  const params = useParams();
  const appointmentId = params["id"] as string;
  const saveHandlesRef = useRef<ConsultationSaveHandles | null>(null);

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
              chiefComplaint={appointmentData.chiefComplaint ?? undefined}
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
