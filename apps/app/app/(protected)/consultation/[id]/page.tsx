"use client";

import { useParams } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
  ClinicalDocumentationDynamic,
  ConsultationSidebarUI as ConsultationSidebar,
} from "@/features/consultation/components";
import { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";
import { ConsultationPageHeaderUI } from "@/features/consultation/components/ConsultationPageHeaderUI";
import { ConsultationLayoutUI } from "@/features/consultation/components/ConsultationLayoutUI";

export default function ConsultationPage() {
  const params = useParams();
  const appointmentId = params["id"] as string;

  const { state, handlers } = useConsultationLogic(appointmentId);

  const {
    appointmentData,
    loading,
    clinic,
    pastAppointments,
    isSidebarOpen,
    defaultTab,
  } = state;

  const { handleBack, handleSave, toggleSidebar } = handlers;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (!appointmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Appointment not found</p>
        <Button onClick={handleBack}>Back to Appointments</Button>
      </div>
    );
  }

  const patientName = appointmentData.patient
    ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
    : "Patient";

  const sidebarProps = {
    appointment: appointmentData,
    pastAppointments: pastAppointments,
  };

  const DesktopSidebar = (
    <ConsultationSidebar {...sidebarProps} onClose={toggleSidebar} />
  );

  const MobileSidebar = <ConsultationSidebar {...sidebarProps} />;

  return (
    <div className="flex flex-col h-screen bg-background">
      {}
      <ConsultationPageHeaderUI
        patientName={patientName}
        appointmentDate={appointmentData.startTime}
        onBack={handleBack}
        MobileSidebarContent={MobileSidebar}
      />

      {}
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
