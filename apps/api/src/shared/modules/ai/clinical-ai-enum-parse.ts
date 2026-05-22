import { z } from 'zod';

const drugInteractionSeveritySchema = z.enum(['mild', 'moderate', 'severe']);
const dosageStatusSchema = z.enum(['appropriate', 'high', 'low']);

export function parseDrugInteractionSeverity(
  rawSeverity: string | undefined,
): z.infer<typeof drugInteractionSeveritySchema> {
  const parsed = drugInteractionSeveritySchema.safeParse(
    rawSeverity?.toLowerCase(),
  );
  return parsed.success ? parsed.data : 'moderate';
}

export function parseDosageRecommendationStatus(
  rawStatus: string | undefined,
): z.infer<typeof dosageStatusSchema> {
  const parsed = dosageStatusSchema.safeParse(rawStatus?.toLowerCase());
  return parsed.success ? parsed.data : 'appropriate';
}
