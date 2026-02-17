import {
  DiagnosisSuggestion,
  MedicationRecommendation,
  PrescriptionAnalysisResponse,
} from '@workspace/types';

interface RawDrugInteraction {
  drug1?: string;
  drug2?: string;
  severity?: string;
  description?: string;
}

interface RawContraindication {
  medication?: string;
  condition?: string;
  description?: string;
}

interface RawDosageRecommendation {
  medication?: string;
  status?: string;
  recommendation?: string;
}

export interface RawPrescriptionAnalysis {
  drugInteractions?: RawDrugInteraction[];
  contraindications?: RawContraindication[];
  dosageRecommendations?: RawDosageRecommendation[];
}

interface RawDiagnosisSuggestion {
  icdCode?: string;
  diagnosis?: string;
  condition?: string;
  confidence?: number;
  description?: string;
}

interface RawMedicationRecommendation {
  medicationName?: string;
  strength?: string;
  frequency?: string;
  indication?: string;
  confidence?: number;
}

export type RawDiagnosisSuggestionsInput =
  | RawDiagnosisSuggestion[]
  | { suggestions: RawDiagnosisSuggestion[] };

export type RawMedicationRecommendationsInput =
  | RawMedicationRecommendation[]
  | { recommendations: RawMedicationRecommendation[] };

export function normalizePrescriptionAnalysis(
  data: RawPrescriptionAnalysis,
): PrescriptionAnalysisResponse {
  const validSeverities = ['mild', 'moderate', 'severe'] as const;
  const validStatuses = ['appropriate', 'high', 'low'] as const;

  return {
    drugInteractions: (data.drugInteractions || []).slice(0, 10).map((item) => {
      const rawSeverity = item.severity?.toLowerCase();
      const severity: 'mild' | 'moderate' | 'severe' = (
        validSeverities as readonly string[]
      ).includes(rawSeverity || '')
        ? (rawSeverity as 'mild' | 'moderate' | 'severe')
        : 'moderate';

      return {
        drug1: item.drug1 || 'Unknown',
        drug2: item.drug2 || 'Unknown',
        severity,
        description: item.description || 'No description',
      };
    }),
    contraindications: (data.contraindications || [])
      .slice(0, 10)
      .map((item) => ({
        medication: item.medication || 'Unknown',
        condition: item.condition || 'Unknown',
        description: item.description || 'No description',
      })),
    dosageRecommendations: (data.dosageRecommendations || [])
      .slice(0, 10)
      .map((item) => {
        const rawStatus = item.status?.toLowerCase();
        const status: 'appropriate' | 'high' | 'low' = (
          validStatuses as readonly string[]
        ).includes(rawStatus || '')
          ? (rawStatus as 'appropriate' | 'high' | 'low')
          : 'appropriate';

        return {
          medication: item.medication || 'Unknown',
          status,
          recommendation: item.recommendation || 'No recommendation',
        };
      }),
  };
}

export function normalizeDiagnosisSuggestions(
  data: RawDiagnosisSuggestionsInput,
): DiagnosisSuggestion[] {
  const suggestions = Array.isArray(data) ? data : data.suggestions || [];

  return suggestions
    .slice(0, 10)
    .filter((suggestion) => {
      const hasCodeOrDiagnosis = Boolean(
        suggestion.icdCode || suggestion.diagnosis,
      );
      const hasConditionOrDiagnosis = Boolean(
        suggestion.condition || suggestion.diagnosis,
      );
      return hasCodeOrDiagnosis && hasConditionOrDiagnosis;
    })
    .map((suggestion) => ({
      icdCode: suggestion.icdCode || 'R69',
      condition:
        suggestion.condition || suggestion.diagnosis || 'Unknown Condition',
      confidence: Math.min(Math.max(suggestion.confidence || 0, 0), 100),
      reasoning: suggestion.description || 'Clinical correlation required',
    }));
}

export function normalizeMedicationRecommendations(
  data: RawMedicationRecommendationsInput,
): MedicationRecommendation[] {
  const recommendations = Array.isArray(data)
    ? data
    : data.recommendations || [];

  return recommendations
    .slice(0, 10)
    .filter((recommendation) => recommendation.medicationName)
    .map((recommendation) => ({
      medicationName: recommendation.medicationName || 'Unknown Medication',
      strength: recommendation.strength || 'As per clinical judgment',
      frequency: recommendation.frequency || 'As per clinical judgment',
      indication: recommendation.indication || '',
      confidence: Math.min(Math.max(recommendation.confidence || 0, 0), 100),
    }));
}
