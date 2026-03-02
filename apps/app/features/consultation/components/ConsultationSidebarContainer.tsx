

"use client";

import { FC } from "react";
import { usePatientHistoryReadOnly } from "@/hooks/api/use-patient-history";
import { Appointment } from "@workspace/types";
import { ConsultationSidebarUI } from "./ConsultationSidebarUI";

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
  onClose?: () => void;
}

export const ConsultationSidebarContainer: FC<
  ConsultationSidebarContainerProps
> = ({ appointmentData, pastAppointments = [], onClose }) => {

  const patientId = appointmentData?.patientId || "";
  const { historyData, patient, isLoading } =
    usePatientHistoryReadOnly(patientId);

  const enrichedPatient = patient
    ? {
        ...patient,

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

      patientAllergies={historyData.patientAllergies}
      surgicalHistory={historyData.surgicalHistory}
      familyHistory={historyData.familyHistory}
      socialHistory={historyData.socialHistory}
      onClose={onClose}
    />
  );
};
