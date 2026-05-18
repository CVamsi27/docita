import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePatient, useUpdatePatient } from "./use-patients";
import { useAPIQuery } from "@/lib/api/api-core";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { logger } from "@/lib/monitoring/logger";
import { patientsApi } from "@/features/patients/api/patients.api";
import {
  CreatePatientSocialHistoryInput,
  Feature,
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";

interface FullMedicalHistoryResponse {
  conditions?: PatientMedicalCondition[];
  allergies?: PatientAllergy[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  surgicalHistory?: PatientSurgicalHistory[];
}

const medicalHistoryQueryKey = (patientId: string) => [
  "patients",
  patientId,
  "medical-history",
];

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

export interface HistoryOperations {
  addCondition: (conditionName: string) => void;
  removeCondition: (id: string) => void;

  addAllergy: (
    allergen: string,
    severity?: PatientAllergy["severity"],
    allergyType?: PatientAllergy["allergyType"],
  ) => void;
  removeAllergy: (id: string) => void;
  updateAllergy: (allergy: PatientAllergy) => void;

  addSurgery: (procedureName: string, procedureDate?: string) => void;
  removeSurgery: (id: string) => void;

  addFamilyHistory: (condition: string, relationship: string) => void;
  removeFamilyHistory: (id: string) => void;

  updateSocialHistory: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;

  updateCustomData: (
    key: string,
    value: string | number | boolean | Record<string, unknown>,
  ) => void;
}

export interface PatientHistoryData {
  medicalConditions: PatientMedicalCondition[];
  patientAllergies: PatientAllergy[];
  surgicalHistory: PatientSurgicalHistory[];
  familyHistory: PatientFamilyHistory[];
  socialHistory: PatientSocialHistory | null;
  customData: Record<string, unknown>;
}

export interface UsePatientHistoryResult {
  historyData: PatientHistoryData;
  patient: PatientWithMedicalHistory | undefined;
  isLoading: boolean;
  isError: boolean;

  operations: HistoryOperations;
}

const HISTORY_ERROR_MESSAGE =
  "We could not update this medical history. Please try again.";

export function usePatientHistory(patientId: string): UsePatientHistoryResult {
  const queryClient = useQueryClient();
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  const {
    data: patientData,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(patientId);
  const {
    data: medicalHistoryData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useAPIQuery<FullMedicalHistoryResponse>(
    medicalHistoryQueryKey(patientId),
    `/patients/${patientId}/medical-history`,
    { enabled: tierPatientsOk && !!patientId },
  );
  const { mutate: updatePatient } = useUpdatePatient(patientId);

  const patient = useMemo<PatientWithMedicalHistory | undefined>(() => {
    if (!patientData) return undefined;
    const base = patientData as PatientWithMedicalHistory;
    return {
      ...base,
      medicalConditions: medicalHistoryData?.conditions ?? [],
      patientAllergies: medicalHistoryData?.allergies ?? [],
      familyHistory: medicalHistoryData?.familyHistory ?? [],
      socialHistory: medicalHistoryData?.socialHistory ?? undefined,
      surgicalHistory: medicalHistoryData?.surgicalHistory ?? [],
    };
  }, [patientData, medicalHistoryData]);

  const isLoading = isPatientLoading || isHistoryLoading;
  const isError = isPatientError || isHistoryError;

  const invalidatePatient = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["patients", patientId],
    });
    void queryClient.invalidateQueries({
      queryKey: medicalHistoryQueryKey(patientId),
    });
  }, [queryClient, patientId]);

  const handleHistoryError = useCallback((error: unknown) => {
    logger.error("Patient medical history mutation failed", { error });
    showUserFacingErrorToast(error, HISTORY_ERROR_MESSAGE, "save");
  }, []);

  const conditionMutation = useMutation({
    mutationFn: (variables: { conditionName: string }) =>
      patientsApi.createCondition(patientId, {
        conditionName: variables.conditionName,
        conditionType: "CHRONIC",
        status: "ACTIVE",
        sourceType: "MANUAL",
        diagnosedBy: "",
        notes: "",
      }),
    onSuccess: () => {
      toast.success("Condition added");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const removeConditionMutation = useMutation({
    mutationFn: (conditionId: string) =>
      patientsApi.deleteCondition(patientId, conditionId),
    onSuccess: () => {
      toast.success("Condition removed");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const allergyMutation = useMutation({
    mutationFn: (variables: {
      allergen: string;
      severity: PatientAllergy["severity"];
      allergyType: PatientAllergy["allergyType"];
    }) =>
      patientsApi.createAllergy(patientId, {
        allergen: variables.allergen,
        severity: variables.severity,
        allergyType: variables.allergyType,
        reaction: "",
      }),
    onSuccess: () => {
      toast.success("Allergy added");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const removeAllergyMutation = useMutation({
    mutationFn: (allergyId: string) =>
      patientsApi.deleteAllergy(patientId, allergyId),
    onSuccess: () => {
      toast.success("Allergy removed");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const updateAllergyMutation = useMutation({
    mutationFn: (allergy: PatientAllergy) => {
      if (!allergy.id) {
        throw new Error("Allergy id is required to update");
      }
      return patientsApi.updateAllergy(patientId, allergy.id, {
        allergen: allergy.allergen,
        severity: allergy.severity,
        allergyType: allergy.allergyType,
        reaction: allergy.reaction,
        onsetDate: allergy.onsetDate,
        notes: allergy.notes,
      });
    },
    onSuccess: () => {
      toast.success("Allergy updated");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const surgeryMutation = useMutation({
    mutationFn: (variables: {
      procedureName: string;
      procedureDate?: string;
    }) =>
      patientsApi.createSurgicalHistory(patientId, {
        procedureName: variables.procedureName,
        procedureDate: variables.procedureDate,
        complications: "",
        notes: "",
      }),
    onSuccess: () => {
      toast.success("Surgery added");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const removeSurgeryMutation = useMutation({
    mutationFn: (surgicalId: string) =>
      patientsApi.deleteSurgicalHistory(patientId, surgicalId),
    onSuccess: () => {
      toast.success("Surgery removed");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const familyMutation = useMutation({
    mutationFn: (variables: { condition: string; relationship: string }) =>
      patientsApi.createFamilyHistory(patientId, {
        condition: variables.condition,
        relationship: variables.relationship,
      }),
    onSuccess: () => {
      toast.success("Family history added");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const removeFamilyMutation = useMutation({
    mutationFn: (familyId: string) =>
      patientsApi.deleteFamilyHistory(patientId, familyId),
    onSuccess: () => {
      toast.success("Family history removed");
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const socialMutation = useMutation({
    mutationFn: (variables: CreatePatientSocialHistoryInput) =>
      patientsApi.upsertSocialHistory(patientId, variables),
    onSuccess: () => {
      invalidatePatient();
    },
    onError: handleHistoryError,
  });

  const handleCustomDataUpdate = useCallback(
    (
      updates: Pick<PatientWithMedicalHistory, "customData">,
      successMessage?: string,
    ) => {
      updatePatient(
        { metadata: updates.customData as Record<string, unknown> },
        {
          onSuccess: () => {
            if (successMessage) {
              toast.success(successMessage);
            }
            invalidatePatient();
          },
          onError: (error) => handleHistoryError(error),
        },
      );
    },
    [updatePatient, invalidatePatient, handleHistoryError],
  );

  const addCondition = useCallback(
    (conditionName: string) => {
      const trimmed = conditionName.trim();
      if (!trimmed) return;
      conditionMutation.mutate({ conditionName: trimmed });
    },
    [conditionMutation],
  );

  const removeCondition = useCallback(
    (id: string) => {
      removeConditionMutation.mutate(id);
    },
    [removeConditionMutation],
  );

  const addAllergy = useCallback(
    (
      allergen: string,
      severity: PatientAllergy["severity"] = "MODERATE",
      allergyType: PatientAllergy["allergyType"] = "DRUG",
    ) => {
      const trimmed = allergen.trim();
      if (!trimmed) return;
      allergyMutation.mutate({
        allergen: trimmed,
        severity,
        allergyType,
      });
    },
    [allergyMutation],
  );

  const removeAllergy = useCallback(
    (id: string) => {
      removeAllergyMutation.mutate(id);
    },
    [removeAllergyMutation],
  );

  const updateAllergy = useCallback(
    (allergy: PatientAllergy) => {
      updateAllergyMutation.mutate(allergy);
    },
    [updateAllergyMutation],
  );

  const addSurgery = useCallback(
    (procedureName: string, procedureDate?: string) => {
      const trimmed = procedureName.trim();
      if (!trimmed) return;
      surgeryMutation.mutate({
        procedureName: trimmed,
        procedureDate: procedureDate || undefined,
      });
    },
    [surgeryMutation],
  );

  const removeSurgery = useCallback(
    (id: string) => {
      removeSurgeryMutation.mutate(id);
    },
    [removeSurgeryMutation],
  );

  const addFamilyHistory = useCallback(
    (condition: string, relationship: string) => {
      const trimmedCondition = condition.trim();
      const trimmedRelationship = relationship.trim();
      if (!trimmedCondition || !trimmedRelationship) return;
      familyMutation.mutate({
        condition: trimmedCondition,
        relationship: trimmedRelationship,
      });
    },
    [familyMutation],
  );

  const removeFamilyHistory = useCallback(
    (id: string) => {
      removeFamilyMutation.mutate(id);
    },
    [removeFamilyMutation],
  );

  const updateSocialHistory = useCallback(
    (field: keyof PatientSocialHistory, value: string) => {
      const currentSocial = patient?.socialHistory;
      const next: CreatePatientSocialHistoryInput = {
        smokingStatus: currentSocial?.smokingStatus,
        smokingPackYears: currentSocial?.smokingPackYears,
        smokingQuitDate: currentSocial?.smokingQuitDate,
        alcoholUse: currentSocial?.alcoholUse,
        alcoholFrequency: currentSocial?.alcoholFrequency,
        substanceUse: currentSocial?.substanceUse,
        occupation: currentSocial?.occupation,
        occupationalHazards: currentSocial?.occupationalHazards,
        exerciseFrequency: currentSocial?.exerciseFrequency,
        dietaryRestrictions: currentSocial?.dietaryRestrictions,
        notes: currentSocial?.notes,
        [field]: value,
      } as CreatePatientSocialHistoryInput;
      socialMutation.mutate(next);
    },
    [patient?.socialHistory, socialMutation],
  );

  const updateCustomData = useCallback(
    (
      key: string,
      value: string | number | boolean | Record<string, unknown>,
    ) => {
      if (!patient) return;
      const currentCustomData = toRecord(patient.customData);
      handleCustomDataUpdate({
        customData: {
          ...currentCustomData,
          [key]: value,
        } as PatientWithMedicalHistory["customData"],
      });
    },
    [patient, handleCustomDataUpdate],
  );

  const historyData: PatientHistoryData = {
    medicalConditions: patient?.medicalConditions || [],
    patientAllergies: patient?.patientAllergies || [],
    surgicalHistory: patient?.surgicalHistory || [],
    familyHistory: patient?.familyHistory || [],
    socialHistory: patient?.socialHistory || null,
    customData: toRecord(patient?.customData),
  };

  const operations: HistoryOperations = {
    addCondition,
    removeCondition,
    addAllergy,
    removeAllergy,
    updateAllergy,
    addSurgery,
    removeSurgery,
    addFamilyHistory,
    removeFamilyHistory,
    updateSocialHistory,
    updateCustomData,
  };

  return {
    historyData,
    patient,
    isLoading,
    isError,
    operations,
  };
}

export function usePatientHistoryReadOnly(patientId: string) {
  const { data: patientData, isLoading, isError } = usePatient(patientId);

  const patient = patientData as PatientWithMedicalHistory | undefined;

  const historyData: PatientHistoryData = {
    medicalConditions: patient?.medicalConditions || [],
    patientAllergies: patient?.patientAllergies || [],
    surgicalHistory: patient?.surgicalHistory || [],
    familyHistory: patient?.familyHistory || [],
    socialHistory: patient?.socialHistory || null,
    customData: toRecord(patient?.customData),
  };

  return {
    historyData,
    patient,
    isLoading,
    isError,
  };
}
