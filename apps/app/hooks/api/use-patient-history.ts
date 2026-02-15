/**
 * Patient History Hook - Shared service for patient medical history
 * Following Single Responsibility Principle - only handles history data
 * Used by both Patient Details and Consultation views
 */

import { useCallback } from "react";
import { toast } from "sonner";
import { usePatient, useUpdatePatient } from "./use-patients";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

// Generate unique IDs for new entries
const generateId = () => Math.random().toString(36).substr(2, 9);

// Types for history operations
export interface HistoryOperations {
  // Conditions
  addCondition: (conditionName: string) => void;
  removeCondition: (id: string) => void;
  
  // Allergies
  addAllergy: (allergen: string, severity?: string, allergyType?: string) => void;
  removeAllergy: (id: string) => void;
  updateAllergy: (allergy: PatientAllergy) => void;
  
  // Surgeries
  addSurgery: (procedureName: string, procedureDate?: string) => void;
  removeSurgery: (id: string) => void;
  
  // Family History
  addFamilyHistory: (condition: string, relationship: string) => void;
  removeFamilyHistory: (id: string) => void;
  
  // Social History
  updateSocialHistory: (field: keyof PatientSocialHistory, value: string) => void;
  
  // Custom Data (for specialty fields)
  updateCustomData: (key: string, value: string | number | boolean | Record<string, unknown>) => void;
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
  // Data
  historyData: PatientHistoryData;
  patient: PatientWithMedicalHistory | undefined;
  isLoading: boolean;
  isError: boolean;
  
  // Operations
  operations: HistoryOperations;
}

/**
 * Hook to manage patient medical history
 * Provides unified interface for CRUD operations on patient history
 */
export function usePatientHistory(patientId: string): UsePatientHistoryResult {
  const { data: patientData, isLoading, isError } = usePatient(patientId);
  const { mutate: updatePatient } = useUpdatePatient(patientId);
  
  // Cast to PatientWithMedicalHistory for proper typing
  const patient = patientData as PatientWithMedicalHistory | undefined;

  // Generic update handler
  const handleUpdate = useCallback(
    (updates: Partial<PatientWithMedicalHistory>, successMessage?: string) => {
      updatePatient(updates, {
        onSuccess: () => {
          if (successMessage) {
            toast.success(successMessage);
          }
        },
        onError: () => {
          toast.error("Failed to update medical history");
        },
      });
    },
    [updatePatient]
  );

  // Condition operations
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
        "Condition added"
      );
    },
    [patient, patientId, handleUpdate]
  );

  const removeCondition = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentConditions = patient.medicalConditions || [];
      handleUpdate(
        { medicalConditions: currentConditions.filter((c: PatientMedicalCondition) => c.id !== id) },
        "Condition removed"
      );
    },
    [patient, handleUpdate]
  );

  // Allergy operations
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
        "Allergy added"
      );
    },
    [patient, patientId, handleUpdate]
  );

  const removeAllergy = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentAllergies = patient.patientAllergies || [];
      handleUpdate(
        { patientAllergies: currentAllergies.filter((a: PatientAllergy) => a.id !== id) },
        "Allergy removed"
      );
    },
    [patient, handleUpdate]
  );

  const updateAllergy = useCallback(
    (allergy: PatientAllergy) => {
      if (!patient) return;
      const currentAllergies = patient.patientAllergies || [];
      const updated = currentAllergies.map((a: PatientAllergy) =>
        a.id === allergy.id ? allergy : a
      );
      handleUpdate({ patientAllergies: updated }, "Allergy updated");
    },
    [patient, handleUpdate]
  );

  // Surgery operations
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
        "Surgery added"
      );
    },
    [patient, patientId, handleUpdate]
  );

  const removeSurgery = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentSurgeries = patient.surgicalHistory || [];
      handleUpdate(
        { surgicalHistory: currentSurgeries.filter((s: PatientSurgicalHistory) => s.id !== id) },
        "Surgery removed"
      );
    },
    [patient, handleUpdate]
  );

  // Family history operations
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
        "Family history added"
      );
    },
    [patient, patientId, handleUpdate]
  );

  const removeFamilyHistory = useCallback(
    (id: string) => {
      if (!patient) return;
      const currentHistory = patient.familyHistory || [];
      handleUpdate(
        { familyHistory: currentHistory.filter((h: PatientFamilyHistory) => h.id !== id) },
        "Family history removed"
      );
    },
    [patient, handleUpdate]
  );

  // Social history operations
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
    [patient, patientId, handleUpdate]
  );

  // Custom data operations (for specialty fields like dental chart, growth data, etc.)
  const updateCustomData = useCallback(
    (key: string, value: string | number | boolean | Record<string, unknown>) => {
      if (!patient) return;
      const currentCustomData =
        (patient.customData as Record<string, unknown>) || {};
      handleUpdate({
        customData: {
          ...currentCustomData,
          [key]: value,
        } as PatientWithMedicalHistory["customData"],
      });
    },
    [patient, handleUpdate]
  );

  // Compose history data
  const historyData: PatientHistoryData = {
    medicalConditions: patient?.medicalConditions || [],
    patientAllergies: patient?.patientAllergies || [],
    surgicalHistory: patient?.surgicalHistory || [],
    familyHistory: patient?.familyHistory || [],
    socialHistory: patient?.socialHistory || null,
    customData: (patient?.customData as Record<string, unknown>) || {},
  };

  // Compose operations
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

/**
 * Read-only hook for patient history data
 * Used by components that only need to display history (e.g., consultation sidebar)
 */
export function usePatientHistoryReadOnly(patientId: string) {
  const { data: patientData, isLoading, isError } = usePatient(patientId);
  
  // Cast to PatientWithMedicalHistory for proper typing
  const patient = patientData as PatientWithMedicalHistory | undefined;

  const historyData: PatientHistoryData = {
    medicalConditions: patient?.medicalConditions || [],
    patientAllergies: patient?.patientAllergies || [],
    surgicalHistory: patient?.surgicalHistory || [],
    familyHistory: patient?.familyHistory || [],
    socialHistory: patient?.socialHistory || null,
    customData: (patient?.customData as Record<string, unknown>) || {},
  };

  return {
    historyData,
    patient,
    isLoading,
    isError,
  };
}
