/**
 * Patient Face Sheet Header - Container Component
 * Applies business rules and type mappings for IPD patient header
 */

import { getPatientAgeDisplay } from "../rules/patientRules";
import { getInitials } from "@/features/_shared/utils";
import { PatientFaceSheetHeaderUI } from "./PatientFaceSheetHeaderUI";
import {
  CODE_STATUS_LABELS,
  ISOLATION_STATUS_LABELS,
  type Patient,
} from "@workspace/types";

interface PatientFaceSheetHeaderContainerProps {
  patient: Patient;
}

export function PatientFaceSheetHeaderContainer({
  patient,
}: PatientFaceSheetHeaderContainerProps) {
  const initials = getInitials(patient.firstName, patient.lastName);
  const age = getPatientAgeDisplay(patient);

  // Apply business rules
  const isFullCode = patient.codeStatus === "FULL_CODE";
  const hasAllergies = !!patient.allergies && patient.allergies.length > 0;
  const isIsolation =
    !!patient.isolationStatus && patient.isolationStatus !== "NONE";

  // Get labels from type definitions
  const codeStatusLabel = patient.codeStatus
    ? CODE_STATUS_LABELS[patient.codeStatus]
    : undefined;
  const isolationStatusLabel = patient.isolationStatus
    ? ISOLATION_STATUS_LABELS[patient.isolationStatus]
    : undefined;

  return (
    <PatientFaceSheetHeaderUI
      firstName={patient.firstName}
      lastName={patient.lastName}
      mrn={patient.mrn}
      age={age}
      gender={patient.gender || "UNKNOWN"}
      dateOfBirth={patient.dateOfBirth!}
      initials={initials}
      codeStatus={patient.codeStatus}
      codeStatusLabel={codeStatusLabel}
      isFullCode={isFullCode}
      isolationStatus={patient.isolationStatus}
      isolationStatusLabel={isolationStatusLabel}
      isIsolation={isIsolation}
      fallRisk={patient.fallRisk}
      allergies={patient.allergies}
      hasAllergies={hasAllergies}
      insuranceProvider={patient.insuranceProvider}
      insurancePolicyNumber={patient.insurancePolicyNumber}
      emergencyContactName={patient.emergencyContactName}
      emergencyContactPhone={patient.emergencyContactPhone}
      emergencyContactRelation={patient.emergencyContactRelation}
    />
  );
}
