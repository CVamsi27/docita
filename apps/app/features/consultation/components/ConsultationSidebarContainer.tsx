/**
 * Consultation Sidebar Container
 * Uses shared usePatientHistoryReadOnly hook to display patient history
 * Ensures history data matches between Patient Details and Consultation views
 */

"use client";

import { FC } from "react";
import { usePatientHistoryReadOnly } from "@/hooks/api/use-patient-history";
import { Appointment } from "@workspace/types";
import { ConsultationSidebarUI } from "./ConsultationSidebarUI";

// Flexible type for past appointments
interface PastAppointmentItem {
  id?: string;
  startTime?: string | Date;
  date?: string | Date;
  chiefComplaint?: string;
  finalDiagnosis?: string;
  status?: string;
}

interface ConsultationSidebarContainerProps {
  appointmentData?: Appointment;
  pastAppointments?: PastAppointmentItem[];
}

export const ConsultationSidebarContainer: FC<
  ConsultationSidebarContainerProps
> = ({ appointmentData, pastAppointments = [] }) => {
  // Use shared history hook to get patient data
  const patientId = appointmentData?.patientId || "";
  const { historyData, patient, isLoading } =
    usePatientHistoryReadOnly(patientId);

  // Merge patient data with history data for display
  const enrichedPatient = patient
    ? {
        ...patient,
        // Use history data from shared hook for consistency
        medicalConditions: historyData.medicalConditions.map((c) => ({
          id: c.id || "",
          conditionName: c.conditionName,
        })),
        patientAllergies: historyData.patientAllergies,
        surgicalHistory: historyData.surgicalHistory,
        familyHistory: historyData.familyHistory,
        socialHistory: historyData.socialHistory,
      }
    : undefined;

  // Create enriched appointment with patient data
  const enrichedAppointmentData = appointmentData
    ? {
        ...appointmentData,
        patient: enrichedPatient,
      }
    : undefined;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading patient data...
      </div>
    );
  }

  return (
    <ConsultationSidebarUI
      appointmentData={enrichedAppointmentData}
      pastAppointments={pastAppointments}
      // Pass additional history data for enhanced display
      patientAllergies={historyData.patientAllergies}
      surgicalHistory={historyData.surgicalHistory}
      familyHistory={historyData.familyHistory}
      socialHistory={historyData.socialHistory}
    />
  );
};
