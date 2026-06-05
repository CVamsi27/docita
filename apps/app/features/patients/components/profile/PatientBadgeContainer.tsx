import { useMemo } from "react";
import { calculateAge, getPatientFullName } from "@workspace/utils";
import { getInitials } from "@/lib/formatters";
import { PatientBadgeUI } from "./PatientBadgeUI";

interface PatientData {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string;
  gender?: string;
  phone?: string;
  email?: string;
  allergies?: string | string[];
  avatarUrl?: string;
}

interface PatientBadgeContainerProps {
  patient: PatientData;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  showAllergies?: boolean;
  showContact?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PatientBadgeContainer({
  patient,
  size,
  showDetails,
  showAllergies,
  showContact,
  onClick,
  className,
}: PatientBadgeContainerProps) {
  const fullName = getPatientFullName(patient);
  const initials = getInitials(patient.firstName, patient.lastName);

  const age = useMemo(() => {
    if (!patient.dateOfBirth) return null;
    return calculateAge(patient.dateOfBirth);
  }, [patient.dateOfBirth]);

  const allergiesArray = useMemo(() => {
    if (!patient.allergies) return [];
    if (Array.isArray(patient.allergies)) return patient.allergies;
    return patient.allergies
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }, [patient.allergies]);

  return (
    <PatientBadgeUI
      fullName={fullName}
      initials={initials}
      age={age}
      gender={patient.gender}
      phone={patient.phone}
      email={patient.email}
      allergiesArray={allergiesArray}
      avatarUrl={patient.avatarUrl}
      size={size}
      showDetails={showDetails}
      showAllergies={showAllergies}
      showContact={showContact}
      onClick={onClick}
      className={className}
    />
  );
}
