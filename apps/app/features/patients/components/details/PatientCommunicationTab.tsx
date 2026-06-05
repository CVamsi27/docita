"use client";

import type { PatientWithMedicalHistory } from "@workspace/types";
import { Feature } from "@workspace/types";
import { getPatientFullName } from "@workspace/utils";
import { FeatureGate } from "@/components/auth/feature-gate";
import { PatientWhatsappComposer } from "./PatientWhatsappComposer";

interface PatientCommunicationTabProps {
  patient: PatientWithMedicalHistory;
  patientId: string;
}

export function PatientCommunicationTab({
  patient,
  patientId,
}: PatientCommunicationTabProps) {
  return (
    <FeatureGate feature={Feature.WHATSAPP_MESSAGING} showLockedCard>
      <PatientWhatsappComposer
        patientId={patientId}
        patientName={getPatientFullName(patient, "this patient")}
        phoneNumber={patient.phoneNumber}
      />
    </FeatureGate>
  );
}
