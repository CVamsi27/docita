"use client";

import { useState } from "react";

interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity?: "warning" | "critical";
  suggestion?: string;
}

interface ContraindicationResult {
  isContraindicated: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  recommendation: string;
  alternatives?: string[];
}

interface ComprehensiveCheckResult {
  dosageValidations: ValidationResult[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contraindications: any[];
  warnings: string[];
  errors: string[];
  isApproved: boolean;
  requiresReview: boolean;
  summary: {
    totalMedications: number;
    validMedications: number;
    warnings: number;
    errors: number;
  };
}

export function useMedicationValidation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateDosage = async (
    medication: string,
    dosage: string,
  ): Promise<ValidationResult | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/medications/validate-dosage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication, dosage }),
      });

      if (!response.ok) throw new Error("Dosage validation failed");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/medications/check-contraindications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication, ...patientData }),
      });

      if (!response.ok) throw new Error("Contraindication check failed");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const checkInteractions = async (
    medications: Array<{ name: string; dosage?: string }>,
    patientAllergies?: string[],
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/medications/check-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medications, patientAllergies }),
      });

      if (!response.ok) throw new Error("Interaction check failed");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/medications/comprehensive-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!response.ok) throw new Error("Comprehensive check failed");
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    validateDosage,
    checkContraindications,
    checkInteractions,
    comprehensiveCheck,
    isLoading,
    error,
  };
}
