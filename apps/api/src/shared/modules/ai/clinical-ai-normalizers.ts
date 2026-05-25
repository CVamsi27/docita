import { PrescriptionAnalysisResponse } from '@workspace/types';
import { isRecord } from '@workspace/utils';
import {
  parseDosageRecommendationStatus,
  parseDrugInteractionSeverity,
} from '@/shared/modules/ai/clinical-ai-enum-parse';

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

export function normalizePrescriptionAnalysis(
  data: Record<string, unknown>,
): PrescriptionAnalysisResponse {
  const drugInteractions = Array.isArray(data.drugInteractions)
    ? data.drugInteractions
    : [];
  const contraindications = Array.isArray(data.contraindications)
    ? data.contraindications
    : [];
  const dosageRecommendations = Array.isArray(data.dosageRecommendations)
    ? data.dosageRecommendations
    : [];

  return {
    drugInteractions: drugInteractions.slice(0, 10).map((item) => {
      const row = isRecord(item) ? item : {};
      const severity = parseDrugInteractionSeverity(
        readStringField(row, 'severity'),
      );

      return {
        drug1: readStringField(row, 'drug1') ?? 'Unknown',
        drug2: readStringField(row, 'drug2') ?? 'Unknown',
        severity,
        description: readStringField(row, 'description') ?? 'No description',
      };
    }),
    contraindications: contraindications.slice(0, 10).map((item) => {
      const row = isRecord(item) ? item : {};
      return {
        medication: readStringField(row, 'medication') ?? 'Unknown',
        condition: readStringField(row, 'condition') ?? 'Unknown',
        description: readStringField(row, 'description') ?? 'No description',
      };
    }),
    dosageRecommendations: dosageRecommendations.slice(0, 10).map((item) => {
      const row = isRecord(item) ? item : {};
      const status = parseDosageRecommendationStatus(
        readStringField(row, 'status'),
      );

      return {
        medication: readStringField(row, 'medication') ?? 'Unknown',
        status,
        recommendation:
          readStringField(row, 'recommendation') ?? 'No recommendation',
      };
    }),
  };
}
