import { z } from "zod";

export const featureFlagBoolMapSchema = z.record(z.string(), z.boolean());

export const featureFlagDefinitionSchema = z.object({
  key: z.string().min(1).max(64),
  description: z.string().min(1).max(500),
  defaultEnabled: z.boolean(),
  clinicOverrides: featureFlagBoolMapSchema.nullable().optional(),
  userOverrides: featureFlagBoolMapSchema.nullable().optional(),
  percentageRollout: z.number().int().min(0).max(100).nullable().optional(),
});

export const featureFlagUpsertRequestSchema = featureFlagDefinitionSchema.extend({
  description: z.string().min(1).max(500).optional(),
});

export const featureFlagResolvedMapSchema = z.record(z.string(), z.boolean());

export const featureFlagResolvedResponseSchema = z.object({
  flags: featureFlagResolvedMapSchema,
});

export type FeatureFlagDefinition = z.infer<typeof featureFlagDefinitionSchema>;
export type FeatureFlagUpsertRequest = z.infer<
  typeof featureFlagUpsertRequestSchema
>;
export type FeatureFlagResolvedResponse = z.infer<
  typeof featureFlagResolvedResponseSchema
>;
