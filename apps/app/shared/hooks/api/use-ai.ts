import { useAPIMutation } from "@/lib/api/api-core";

export const useAIPrescriptionAnalysis = () =>
  useAPIMutation<
    {
      drugInteractions: Array<{
        drug1: string;
        drug2: string;
        severity: "mild" | "moderate" | "severe";
        description: string;
      }>;
      contraindications: Array<{
        medication: string;
        condition: string;
        description: string;
      }>;
      dosageRecommendations: Array<{
        medication: string;
        status: "appropriate" | "high" | "low";
        recommendation: string;
      }>;
    },
    {
      medications: Array<{ name: string; dosage: string }>;
      patientAge?: number;
      patientAllergies?: string[];
      existingConditions?: string[];
    }
  >("/ai/prescription-analysis", "POST");

export const useAIDiagnosisSuggestions = () =>
  useAPIMutation<
    Array<{
      icdCode: string;
      diagnosis: string;
      confidence: number;
      description: string;
    }>,
    { symptoms: string[]; findingsNotes?: string }
  >("/ai/diagnosis-suggestions", "POST");

export const useAIMedicationRecommendations = () =>
  useAPIMutation<
    Array<{
      medicationName: string;
      strength: string;
      frequency: string;
      indication: string;
      confidence: number;
    }>,
    { condition: string; patientAge?: number; allergies?: string[] }
  >("/ai/medication-recommendations", "POST");
