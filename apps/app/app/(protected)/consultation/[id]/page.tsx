"use client";

import { useParams } from "next/navigation";
import { DataState } from "@workspace/ui/components/data-state";
import { ConsultationShell } from "@/features/consultation/workspace/ConsultationShell";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import { ConsultationPageHeaderUI } from "@/features/consultation/components/ConsultationPageHeaderUI";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import { isConsultationReadOnlyStatus } from "@/features/appointments/rules/appointmentRules";
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
  } = state;

  const { handleBack } = handlers;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4 sm:p-6 md:p-8">
        <DataState status="loading" loadingMessage="Loading consultation..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center p-4 sm:p-6 md:p-8">
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
      <div className="flex h-full items-center justify-center p-4 sm:p-6 md:p-8">
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
      <div className="flex h-full flex-col items-center justify-center gap-4 p-4 sm:p-6 md:p-8">
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

  const consultationReadOnly = isConsultationReadOnlyStatus(
    appointmentData.status,
  );

  const MobileSidebar = (
    <ConsultationSidebarContainer appointmentData={appointmentData} />
  );

  return (
    <div className="flex h-full flex-col bg-muted/20">
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
          onBack={handleBack}
          MobileSidebarContent={MobileSidebar}
        />

        <ConsultationShell
          appointmentData={appointmentData}
          clinicType={clinic?.type}
          readOnly={consultationReadOnly}
        />
      </div>
    </div>
  );
}
