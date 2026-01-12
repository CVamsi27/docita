/**
 * Patient Badge - Container Component
 * Handles data processing for patient badge display
 */

import { useMemo } from "react";
import { differenceInYears } from "date-fns";
import { getInitials } from "@/features/_shared/utils";
import { PatientBadgeUI } from "./PatientBadgeUI";

interface PatientData {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | string;
  gender?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
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
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const initials = getInitials(patient.firstName, patient.lastName);

  const age = useMemo(() => {
    if (!patient.dateOfBirth) return null;
    const dob =
      typeof patient.dateOfBirth === "string"
        ? new Date(patient.dateOfBirth)
        : patient.dateOfBirth;
    return differenceInYears(new Date(), dob);
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
      bloodGroup={patient.bloodGroup}
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
