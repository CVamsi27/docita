"use client";

import { FC } from "react";
import { usePatientHistoryReadOnly } from "@/hooks/api/use-patient-history";
import { usePatientTimeline, usePatientSnapshot } from "@/hooks/api/use-patient-timeline";
import { Appointment } from "@workspace/types";
import { ConsultationSidebarUI } from "./ConsultationSidebarUI";

interface ConsultationSidebarContainerProps {
  appointmentData?: Appointment;
  pastAppointments?: unknown[];
  onClose?: () => void;
}

export const ConsultationSidebarContainer: FC<
  ConsultationSidebarContainerProps
> = ({ appointmentData, onClose }) => {
  const patientId = appointmentData?.patientId || "";

  const { historyData, patient, isLoading } =
    usePatientHistoryReadOnly(patientId);

  const { data: timelineData } = usePatientTimeline(patientId, {
    limit: 20,
  });

  const { data: snapshot } = usePatientSnapshot(patientId);

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
      surgicalHistory={historyData.surgicalHistory}
      familyHistory={historyData.familyHistory}
      socialHistory={historyData.socialHistory}
      timelineData={timelineData}
      snapshot={snapshot}
      onClose={onClose}
    />
  );
};
