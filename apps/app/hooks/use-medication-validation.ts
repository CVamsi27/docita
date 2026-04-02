"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  checkMedicationContraindications,
  checkMedicationInteractions,
  runMedicationComprehensiveCheck,
  validateMedicationDosage,
  type ComprehensiveCheckResult,
  type ContraindicationResult,
  type ValidationResult,
} from "@/hooks/api/medication-validation-api";

export function useMedicationValidation() {
  const [error, setError] = useState<string | null>(null);
  const validateDosageMutation = useMutation({
    mutationFn: validateMedicationDosage,
  });

  const checkContraindicationsMutation = useMutation({
    mutationFn: (payload: {
      medication: string;
      allergies?: string[];
      conditions?: string[];
      currentMedications?: string[];
      isPregnant?: boolean;
    }) => checkMedicationContraindications(payload),
  });

  const checkInteractionsMutation = useMutation({
    mutationFn: (payload: {
      medications: Array<{ name: string; dosage?: string }>;
      patientAllergies?: string[];
    }) => checkMedicationInteractions(payload),
  });

  const comprehensiveCheckMutation = useMutation({
    mutationFn: (params: {
      medications: Array<{ name: string; dosage: string }>;
      patientAllergies?: string[];
      currentMedications?: string[];
      isPregnant?: boolean;
      age?: number;
      weight?: number;
      renalFunction?: string;
    }) => runMedicationComprehensiveCheck(params),
  });

  const validateDosage = async (
    medication: string,
    dosage: string,
  ): Promise<ValidationResult | null> => {
    setError(null);
    try {
      return await validateDosageMutation.mutateAsync({ medication, dosage });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const checkContraindications = async (
    medication: string,
    patientData: {
      allergies?: string[];
      conditions?: string[];
      currentMedications?: string[];
      isPregnant?: boolean;
    },
  ): Promise<ContraindicationResult[] | null> => {
    setError(null);
    try {
      return await checkContraindicationsMutation.mutateAsync({
        medication,
        ...patientData,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const checkInteractions = async (
    medications: Array<{ name: string; dosage?: string }>,
    patientAllergies?: string[],
  ) => {
    setError(null);
    try {
      return await checkInteractionsMutation.mutateAsync({
        medications,
        patientAllergies,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const comprehensiveCheck = async (params: {
    medications: Array<{ name: string; dosage: string }>;
    patientAllergies?: string[];
    currentMedications?: string[];
    isPregnant?: boolean;
    age?: number;
    weight?: number;
    renalFunction?: string;
  }): Promise<ComprehensiveCheckResult | null> => {
    setError(null);
    try {
      return await comprehensiveCheckMutation.mutateAsync(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    }
  };

  const isLoading =
    validateDosageMutation.isPending ||
    checkContraindicationsMutation.isPending ||
    checkInteractionsMutation.isPending ||
    comprehensiveCheckMutation.isPending;

  return {
    validateDosage,
    checkContraindications,
    checkInteractions,
    comprehensiveCheck,
    isLoading,
    error,
  };
}
