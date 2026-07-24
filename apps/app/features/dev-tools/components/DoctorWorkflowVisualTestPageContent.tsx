"use client";

import { DoctorDashboardZone, DoctorAppointmentsZone, DoctorConsultationZone, DoctorPatientsZone } from "./DoctorWorkflowVisualTestPageContent.sections";

export default function DoctorWorkflowVisualTestPage() {
  return (
    <div className="space-y-8 p-6 md:p-8" data-testid="doctor-workflow-page">
      <DoctorDashboardZone />
      <DoctorAppointmentsZone />
      <DoctorConsultationZone />
      <DoctorPatientsZone />
    </div>
  );
}
