"use client";

import { useParams } from "next/navigation";
import { DataState } from "@workspace/ui/components/data-state";
import {
  ClinicalDocumentationDynamic,
} from "@/features/consultation/components";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import { ConsultationPageHeaderUI } from "@/features/consultation/components/ConsultationPageHeaderUI";
import { ConsultationLayoutUI } from "@/features/consultation/components/ConsultationLayoutUI";
import { Stethoscope } from "lucide-react";

export default function ConsultationPage() {
  const params = useParams();
  const appointmentId = params["id"] as string;

  const { state, handlers } = useConsultationLogic(appointmentId);

  const {
    appointmentData,
    loading,
    isError,
    isAccessDenied,
    clinic,
    isSidebarOpen,
    defaultTab,
  } = state;

  const { handleBack, handleSave, toggleSidebar } = handlers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <DataState status="loading" loadingMessage="Loading consultation..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <DataState
          status="error"
          errorMessage="We could not open this consultation. Please try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (isAccessDenied) {
    return (
      <div className="flex items-center justify-center h-screen">
        <DataState
          status="error"
          errorMessage="Only the assigned doctor can open this consultation"
          onRetry={handleBack}
        />
      </div>
    );
  }

  if (!appointmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <DataState
          status="empty"
          emptyIcon={Stethoscope}
          emptyTitle="Appointment not found"
          emptyDescription="This consultation is unavailable or has been removed"
          emptyAction={{
            label: "Back to Appointments",
            onClick: handleBack,
          }}
        />
      </div>
    );
  }

  const patientName = appointmentData.patient
    ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
    : "Patient";

  const DesktopSidebar = (
    <ConsultationSidebarContainer
      appointmentData={appointmentData}
      onClose={toggleSidebar}
    />
  );

  const MobileSidebar = (
    <ConsultationSidebarContainer
      appointmentData={appointmentData}
    />
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <ConsultationPageHeaderUI
        patientName={patientName}
        appointmentDate={appointmentData.startTime}
        appointmentId={appointmentId}
        patientId={appointmentData.patientId}
        appointmentType={appointmentData.type}
        appointmentStatus={appointmentData.status}
        chiefComplaint={appointmentData.chiefComplaint ?? undefined}
        onBack={handleBack}
        MobileSidebarContent={MobileSidebar}
      />

      <ConsultationLayoutUI
        Sidebar={DesktopSidebar}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        MainContent={
          <ClinicalDocumentationDynamic
            appointmentId={appointmentId}
            patientId={appointmentData.patientId}
            doctorId={appointmentData.doctorId}
            defaultTab={defaultTab}
            onSave={handleSave}
            isFocusMode={!isSidebarOpen}
            onToggleFocus={toggleSidebar}
            clinicType={clinic?.type}
            appointmentData={appointmentData}
          />
        }
      />
    </div>
  );
}
