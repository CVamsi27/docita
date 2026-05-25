import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  queryKeys,
  usePatient,
  usePatientMedicalHistoryFull,
  useUpdatePatient,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { logger } from "@/lib/monitoring/logger";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { usePatientAllergies } from "./use-patient-allergies";
import { usePatientConditions } from "./use-patient-conditions";
import { usePatientFamilyHistory } from "./use-patient-family-history";
import { usePatientSocialHistory } from "./use-patient-social-history";
import { usePatientSurgeries } from "./use-patient-surgeries";

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
  const {
    data: patientData,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(patientId);
  const {
    data: medicalHistoryData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = usePatientMedicalHistoryFull(patientId);
  const { mutate: updatePatient } = useUpdatePatient(patientId);

  const patient = useMemo((): PatientWithMedicalHistory | undefined => {
    if (!patientData) return undefined;
    return {
      ...patientData,
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
      queryKey: queryKeys.patients.byId(patientId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.patients.medicalHistoryFull(patientId),
    });
  }, [queryClient, patientId]);

  const handleHistoryError = useCallback((error: unknown) => {
    logger.error("Patient medical history mutation failed", { error });
    showUserFacingErrorToast(error, HISTORY_ERROR_MESSAGE, "save");
  }, []);

  const handleCustomDataUpdate = useCallback(
    (metadata: Record<string, unknown>, successMessage?: string) => {
      updatePatient(
        { metadata },
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

  const conditionOperations = usePatientConditions({
    patientId,
    invalidatePatient,
    onError: handleHistoryError,
  });
  const allergyOperations = usePatientAllergies({
    patientId,
    invalidatePatient,
    onError: handleHistoryError,
  });
  const surgeryOperations = usePatientSurgeries({
    patientId,
    invalidatePatient,
    onError: handleHistoryError,
  });
  const familyHistoryOperations = usePatientFamilyHistory({
    patientId,
    invalidatePatient,
    onError: handleHistoryError,
  });
  const socialHistoryOperations = usePatientSocialHistory({
    patientId,
    socialHistory: patient?.socialHistory,
    invalidatePatient,
    onError: handleHistoryError,
  });

  const updateCustomData = useCallback(
    (
      key: string,
      value: string | number | boolean | Record<string, unknown>,
    ) => {
      if (!patient) return;
      const currentCustomData = toRecord(patient.customData);
      handleCustomDataUpdate({
        ...currentCustomData,
        [key]: value,
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
    ...conditionOperations,
    ...allergyOperations,
    ...surgeryOperations,
    ...familyHistoryOperations,
    ...socialHistoryOperations,
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

  const historyData: PatientHistoryData = {
    medicalConditions: [],
    patientAllergies: [],
    surgicalHistory: [],
    familyHistory: [],
    socialHistory: null,
    customData: toRecord(patientData?.customData),
  };

  return {
    historyData,
    patient: patientData,
    isLoading,
    isError,
  };
}
