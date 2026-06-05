"use client";

import { FC } from "react";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
} from "@workspace/types";
import {
  AllergiesSection,
  ConditionsSection,
  SurgeriesSection,
  FamilyHistorySection,
  SocialHistorySection,
} from "./PatientHistorySummaryCardSections";

interface PatientHistorySummaryCardProps {
  conditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  surgeries?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  compact?: boolean;
  showClinicalHistory?: boolean;
  className?: string;
}

export const PatientHistorySummaryCard: FC<PatientHistorySummaryCardProps> = ({
  conditions = [],
  allergies = [],
  surgeries = [],
  familyHistory = [],
  socialHistory,
  compact = false,
  showClinicalHistory = true,
  className = "",
}) => {
  const hasConditions = conditions.length > 0;
  const hasAllergies = allergies.length > 0;
  const hasSurgeries = surgeries.length > 0;
  const hasFamilyHistory = familyHistory.length > 0;
  const hasSocialHistory =
    socialHistory &&
    (socialHistory.smokingStatus ||
      socialHistory.alcoholUse ||
      socialHistory.occupation);

  const hasAnyHistory =
    (showClinicalHistory && (hasConditions || hasAllergies)) ||
    hasSurgeries ||
    hasFamilyHistory ||
    hasSocialHistory;

  if (!hasAnyHistory && compact) {
    return (
      <div
        className={`text-sm text-muted-foreground italic p-4 border rounded-lg bg-muted/5 text-center ${className}`}
      >
        No medical history recorded
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {showClinicalHistory && <AllergiesSection allergies={allergies} />}
      {showClinicalHistory && <ConditionsSection conditions={conditions} compact={compact} />}
      <SurgeriesSection surgeries={surgeries} compact={compact} />
      <FamilyHistorySection familyHistory={familyHistory} compact={compact} />
      <SocialHistorySection socialHistory={socialHistory} compact={compact} />
    </div>
  );
};
