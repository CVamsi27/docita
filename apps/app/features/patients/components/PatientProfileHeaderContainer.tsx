/**
 * Patient Profile Header - Container Component
 * Fetches patient data and applies business rules
 */

import { usePatient } from "../hooks/usePatients";
import {
  getPatientDisplayName,
  getPatientAgeDisplay,
} from "../rules/patientRules";
import { getInitials } from "@/features/_shared/utils";
import { PatientProfileHeaderUI } from "./PatientProfileHeaderUI";

interface PatientProfileHeaderContainerProps {
  patientId: string;
  onEdit?: () => void;
}

export function PatientProfileHeaderContainer({
  patientId,
  onEdit,
}: PatientProfileHeaderContainerProps) {
  const { data: patient, isLoading } = usePatient(patientId);

  if (isLoading || !patient) {
    return (
      <div className="rounded-2xl border bg-background/60 p-8 animate-pulse">
        <div className="flex gap-6">
          <div className="h-32 w-32 rounded-full bg-muted" />
          <div className="space-y-4 flex-1">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-6 bg-muted rounded w-24" />
              <div className="h-6 bg-muted rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = getInitials(patient.firstName, patient.lastName);
  const ageDisplay = getPatientAgeDisplay(patient);

  return (
    <PatientProfileHeaderUI
      firstName={patient.firstName}
      lastName={patient.lastName}
      initials={initials}
      age={ageDisplay}
      gender={patient.gender || "UNKNOWN"}
      dateOfBirth={patient.dateOfBirth}
      patientId={patient.id || ""}
      email={patient.email || undefined}
      phoneNumber={patient.phoneNumber}
      address={patient.address || undefined}
      onEdit={onEdit}
    />
  );
}
