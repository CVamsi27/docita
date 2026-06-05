"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  type ClinicDetails,
  type ClinicRegistrationData,
  type ComplianceSettings,
  type TeamMember,
} from "@/features/onboarding/components/types";

interface UseClinicRegistrationFieldActionsParams {
  ensureOnboardingId: () => Promise<string>;
  setFormData: Dispatch<SetStateAction<ClinicRegistrationData>>;
  setStep: (step: number) => void;
}

export function useClinicRegistrationFieldActions({
  ensureOnboardingId,
  setFormData,
  setStep,
}: UseClinicRegistrationFieldActionsParams) {
  const setClinicDetails = useCallback(
    (data: ClinicDetails) => {
      setFormData((prev) => ({ ...prev, clinicDetails: data }));
      setStep(2);
    },
    [setFormData, setStep],
  );

  const setClinicWeeklyHours = useCallback(
    (rows: ClinicRegistrationData["clinicWeeklyHours"]) => {
      setFormData((prev) => ({ ...prev, clinicWeeklyHours: rows }));
      setStep(3);
    },
    [setFormData, setStep],
  );

  const setTeamMembers = useCallback(
    async (members: TeamMember[]) => {
      setFormData((prev) => ({ ...prev, teamMembers: members }));
      await ensureOnboardingId();
      setStep(4);
    },
    [ensureOnboardingId, setFormData, setStep],
  );

  const goBackFromCompliance = useCallback(() => setStep(4), [setStep]);

  const setComplianceDraft = useCallback(
    (compliance: Partial<ComplianceSettings>) => {
      setFormData((prev) => ({
        ...prev,
        compliance: { ...prev.compliance, ...compliance },
      }));
    },
    [setFormData],
  );

  return {
    setClinicDetails,
    setClinicWeeklyHours,
    setTeamMembers,
    goBackFromCompliance,
    setComplianceDraft,
  };
}
