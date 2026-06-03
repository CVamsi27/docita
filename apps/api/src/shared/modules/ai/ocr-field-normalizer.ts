import {
  OcrExtractedFields,
  FieldConfidenceConfig,
  OcrRawData,
} from '@workspace/types';

import { FIELD_RULES } from './ocr-field-rules';

export function calculateOverallConfidence(
  fieldConfidence: Record<string, number>,
): number {
  const scores = Object.values(fieldConfidence);
  return scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
        100
    : 0;
}

export function normalizeOcrFields(
  data: OcrRawData | null | undefined,
  config: FieldConfidenceConfig,
): OcrExtractedFields {
  const fieldConfidence: Record<string, number> = {};

  const assignConfidence = (key: string, hasValue: boolean): number => {
    if (!hasValue) return 0.3;
    const rule = FIELD_RULES.find((r) => r.key === key);
    if (!rule?.confidenceGroup) return 0.75;
    switch (rule.confidenceGroup) {
      case 'medical':
        return config.medicalFields;
      case 'contact':
        return config.contactFields;
      default:
        return 0.75;
    }
  };

  const hasMeaningfulValue = (value: unknown): boolean => {
    if (!value) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return Object.values(value as Record<string, unknown>).some((v) => v);
  };

  const result: Record<string, unknown> = {};
  for (const rule of FIELD_RULES) {
    result[rule.key] = rule.extract(data);
  }

  for (const key of Object.keys(result)) {
    fieldConfidence[key] = assignConfidence(
      key,
      hasMeaningfulValue(result[key]),
    );
  }

  return {
    ...(result as Omit<OcrExtractedFields, 'fieldConfidence'>),
    fieldConfidence,
  };
}
