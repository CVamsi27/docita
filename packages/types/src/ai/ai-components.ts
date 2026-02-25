// ============================================================================
// AI Assistant Tab State Types
// ============================================================================

import { z } from "zod";

export const aiPrescriptionAnalysisInputSchema = z.object({
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string().optional(),
      duration: z.string().optional(),
    }),
  ),
  patientConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
});

export const aiDiagnosisSuggestionSchema = z.object({
  condition: z.string(),
  icdCode: z.string(),
  confidence: z.number(),
  reasoning: z.string(),
});

export const aiMedicationRecommendationSchema = z.object({
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  route: z.string(),
  reason: z.string(),
});

export const aiAnalysisResultSchema = z.object({
  interactions: z
    .array(
      z.object({
        drug1: z.string(),
        drug2: z.string(),
        severity: z.enum(["low", "moderate", "high"]),
        description: z.string(),
      }),
    )
    .optional(),
  recommendations: z.array(aiMedicationRecommendationSchema).optional(),
  warnings: z.array(z.string()).optional(),
});

export const aiExtractionResultSchema = z.object({
  entity: z.string(),
  value: z.string(),
  confidence: z.number(),
});

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "low" | "moderate" | "high";
  description: string;
}

export interface PrescriptionSuggestion {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  notes: string;
}

export interface PrescriptionTabState {
  symptoms: string;
  diagnosis: string;
  currentMedications: string;
  allergies: string;
  isLoading: boolean;
  drugInteractions: DrugInteraction[];
  prescriptionSuggestions: PrescriptionSuggestion[];
}

export interface UIDiagnosisSuggestion {
  condition: string;
  icdCode: string;
  confidence: number;
  reasoning: string;
}

export interface DiagnosisTabState {
  chiefComplaint: string;
  vitalSigns: string;
  examFindings: string;
  isLoading: boolean;
  diagnosisSuggestions: UIDiagnosisSuggestion[];
}

export interface SmartTasksTabState {
  taskType: string;
}

// ============================================================================
// AI Assistant Tab Handler Types
// ============================================================================

export interface PrescriptionTabHandlers {
  setSymptoms: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setCurrentMedications: (value: string) => void;
  setAllergies: (value: string) => void;
  handlePrescriptionAnalysis: () => void;
}

export interface DiagnosisTabHandlers {
  setChiefComplaint: (value: string) => void;
  setVitalSigns: (value: string) => void;
  setExamFindings: (value: string) => void;
  handleDiagnosisAnalysis: () => void;
}

export interface SmartTasksTabHandlers {
  setTaskType: (value: string) => void;
}

// ============================================================================
// Combined AI Assistant State (Union of all tabs)
// ============================================================================

export interface AIAssistantState {
  activeTab: string;
  // Prescription tab fields
  symptoms: string;
  diagnosis: string;
  currentMedications: string;
  allergies: string;
  drugInteractions: PrescriptionTabState["drugInteractions"];
  prescriptionSuggestions: PrescriptionTabState["prescriptionSuggestions"];
  // Diagnosis tab fields
  chiefComplaint: string;
  vitalSigns: string;
  examFindings: string;
  diagnosisSuggestions: UIDiagnosisSuggestion[];
  // Smart tasks tab fields
  taskType: string;
  // Common fields
  isLoading: boolean;
}

export interface AIAssistantHandlers {
  setActiveTab: (tab: string) => void;
  // Prescription tab handlers
  setSymptoms: (value: string) => void;
  setDiagnosis: (value: string) => void;
  setCurrentMedications: (value: string) => void;
  setAllergies: (value: string) => void;
  handlePrescriptionAnalysis: () => void;
  // Diagnosis tab handlers
  setChiefComplaint: (value: string) => void;
  setVitalSigns: (value: string) => void;
  setExamFindings: (value: string) => void;
  handleDiagnosisAnalysis: () => void;
  // Smart tasks handlers
  setTaskType: (value: string) => void;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface PrescriptionAssistantTabProps {
  state: AIAssistantState;
  handlers: AIAssistantHandlers;
}

export interface DiagnosisAssistantTabProps {
  state: AIAssistantState;
  handlers: AIAssistantHandlers;
}

export interface SmartTasksTabProps {
  state: AIAssistantState;
  handlers: AIAssistantHandlers;
}
