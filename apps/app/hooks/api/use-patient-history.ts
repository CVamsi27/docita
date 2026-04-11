import { useCallback } from "react";
import { toast } from "sonner";
import { usePatient, useUpdatePatient } from "./use-patients";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface HistoryOperations {
  addCondition: (conditionName: string) => void;
  removeCondition: (id: string) => void;

  addAllergy: (
    allergen: string,
    severity?: string,
    allergyType?: string,
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

export function usePatientHistory(patientId: string): UsePatientHistoryResult {
  const { data: patientData, isLoading, isError } = usePatient(patientId);
  const { mutate: updatePatient } = useUpdatePatient(patientId);

  const patient = patientData as PatientWithMedicalHistory | undefined;

  const handleUpdate = useCallback(
    (updates: Partial<PatientWithMedicalHistory>, successMessage?: string) => {
      updatePatient(updates, {
        onSuccess: () => {
          if (successMessage) {
            toast.success(successMessage);
          }
        },
        onError: () => {
          showUserFacingErrorToast("We could not update this medical history. Please try again.");
        },
      });
    },
    [updatePatient],
  );

  const addCondition = useCallback(
    (conditionName: string) => {
      if (!conditionName.trim() || !patient) return;
      const currentConditions = patient.medicalConditions || [];
      const newEntry: PatientMedicalCondition = {
        id: generateId(),
        patientId,
        conditionName: conditionName.trim(),
        conditionType: "CHRONIC",
        status: "ACTIVE",
        diagnosedBy: "",
        notes: "",
        sourceType: "MANUAL",
      };
      handleUpdate(
        { medicalConditions: [...currentConditions, newEntry] },
        "Condition added",
      );
    },
    [patient, patientId, handleUpdate],
  );

  const removeCondition = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentConditions = patient.medicalConditions || [];
      handleUpdate(
        {
          medicalConditions: currentConditions.filter(
            (c: PatientMedicalCondition) => c.id !== id,
          ),
        },
        "Condition removed",
      );
    },
    [patient, handleUpdate],
  );

  const addAllergy = useCallback(
    (allergen: string, severity = "MODERATE", allergyType = "DRUG") => {
      if (!allergen.trim() || !patient) return;
      const currentAllergies = patient.patientAllergies || [];
      const newEntry: PatientAllergy = {
        id: generateId(),
        patientId,
        allergen: allergen.trim(),
        severity: severity as PatientAllergy["severity"],
        allergyType: allergyType as PatientAllergy["allergyType"],
        reaction: "",
        verifiedBy: "",
        isVerified: false,
      };
      handleUpdate(
        { patientAllergies: [...currentAllergies, newEntry] },
        "Allergy added",
      );
    },
    [patient, patientId, handleUpdate],
  );

  const removeAllergy = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentAllergies = patient.patientAllergies || [];
      handleUpdate(
        {
          patientAllergies: currentAllergies.filter(
            (a: PatientAllergy) => a.id !== id,
          ),
        },
        "Allergy removed",
      );
    },
    [patient, handleUpdate],
  );

  const updateAllergy = useCallback(
    (allergy: PatientAllergy) => {
      if (!patient) return;
      const currentAllergies = patient.patientAllergies || [];
      const updated = currentAllergies.map((a: PatientAllergy) =>
        a.id === allergy.id ? allergy : a,
      );
      handleUpdate({ patientAllergies: updated }, "Allergy updated");
    },
    [patient, handleUpdate],
  );

  const addSurgery = useCallback(
    (procedureName: string, procedureDate?: string) => {
      if (!procedureName.trim() || !patient) return;
      const currentSurgeries = patient.surgicalHistory || [];
      const newEntry: PatientSurgicalHistory = {
        id: generateId(),
        patientId,
        procedureName: procedureName.trim(),
        procedureDate: procedureDate || undefined,
        complications: "",
        notes: "",
      };
      handleUpdate(
        { surgicalHistory: [...currentSurgeries, newEntry] },
        "Surgery added",
      );
    },
    [patient, patientId, handleUpdate],
  );

  const removeSurgery = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentSurgeries = patient.surgicalHistory || [];
      handleUpdate(
        {
          surgicalHistory: currentSurgeries.filter(
            (s: PatientSurgicalHistory) => s.id !== id,
          ),
        },
        "Surgery removed",
      );
    },
    [patient, handleUpdate],
  );

  const addFamilyHistory = useCallback(
    (condition: string, relationship: string) => {
      if (!condition.trim() || !relationship.trim() || !patient) return;
      const currentHistory = patient.familyHistory || [];
      const newEntry: PatientFamilyHistory = {
        id: generateId(),
        patientId,
        condition: condition.trim(),
        relationship: relationship.trim(),
      };
      handleUpdate(
        { familyHistory: [...currentHistory, newEntry] },
        "Family history added",
      );
    },
    [patient, patientId, handleUpdate],
  );

  const removeFamilyHistory = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentHistory = patient.familyHistory || [];
      handleUpdate(
        {
          familyHistory: currentHistory.filter(
            (h: PatientFamilyHistory) => h.id !== id,
          ),
        },
        "Family history removed",
      );
    },
    [patient, handleUpdate],
  );

  const updateSocialHistory = useCallback(
    (field: keyof PatientSocialHistory, value: string) => {
      if (!patient) return;
      const currentSocial = patient.socialHistory || {
        patientId,
        alcoholFrequency: "",
        substanceUse: "",
        occupation: "",
        occupationalHazards: "",
        exerciseFrequency: "",
        dietaryRestrictions: "",
        notes: "",
      };
      handleUpdate({
        socialHistory: {
          ...currentSocial,
          [field]: value,
        },
      });
    },
    [patient, patientId, handleUpdate],
  );

  const updateCustomData = useCallback(
    (
      key: string,
      value: string | number | boolean | Record<string, unknown>,
    ) => {
      if (!patient) return;
      const currentCustomData = toRecord(patient.customData);
      handleUpdate({
        customData: {
          ...currentCustomData,
          [key]: value,
        } as PatientWithMedicalHistory["customData"],
      });
    },
    [patient, handleUpdate],
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
