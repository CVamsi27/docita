import { z } from "zod";

export const metricValueTypeSchema = z.enum([
  "NUMBER",
  "TEXT",
  "BOOLEAN",
  "DATE",
  "JSON",
  "OPTION",
  "MULTI_OPTION",
]);
export type MetricValueType = z.infer<typeof metricValueTypeSchema>;

export const metricCardinalitySchema = z.enum(["SINGLE", "MULTI"]);
export type MetricCardinality = z.infer<typeof metricCardinalitySchema>;

export const metricScopeSchema = z.enum(["PROFILE", "VISIT"]);
export type MetricScope = z.infer<typeof metricScopeSchema>;

export const createMetricCategorySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
});
export type CreateMetricCategoryInput = z.infer<typeof createMetricCategorySchema>;

export const createMetricOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().min(0).optional(),
});
export type CreateMetricOptionInput = z.infer<typeof createMetricOptionSchema>;

export const createMetricDefinitionSchema = z.object({
  categoryId: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  valueType: metricValueTypeSchema,
  unit: z.string().optional(),
  cardinality: metricCardinalitySchema.optional(),
  scope: metricScopeSchema.optional(),
  isTrackedByDefault: z.boolean().optional(),
  isPatientScoped: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  options: z.array(createMetricOptionSchema).optional(),
});
export type CreateMetricDefinitionInput = z.infer<
  typeof createMetricDefinitionSchema
>;

export const upsertMetricSelectionItemSchema = z.object({
  definitionId: z.string().min(1),
  isTracked: z.boolean(),
});
export type UpsertMetricSelectionItemInput = z.infer<
  typeof upsertMetricSelectionItemSchema
>;

export const upsertMetricSelectionsSchema = z.object({
  items: z.array(upsertMetricSelectionItemSchema),
});
export type UpsertMetricSelectionsInput = z.infer<
  typeof upsertMetricSelectionsSchema
>;

export const createPatientMetricValueSchema = z
  .object({
    definitionId: z.string().min(1),
    appointmentId: z.string().optional(),
    recordedAt: z.string().datetime().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    valueString: z.string().optional(),
    valueNumber: z.number().optional(),
    valueBoolean: z.boolean().optional(),
    valueDate: z.string().datetime().optional(),
    valueJson: z.record(z.unknown()).optional(),
    optionId: z.string().optional(),
    optionIds: z.array(z.string().min(1)).optional(),
  })
  .refine(
    (dto) =>
      dto.valueString !== undefined ||
      dto.valueNumber !== undefined ||
      dto.valueBoolean !== undefined ||
      dto.valueDate !== undefined ||
      dto.valueJson !== undefined ||
      dto.optionId !== undefined ||
      (dto.optionIds !== undefined && dto.optionIds.length > 0),
    {
      message: "At least one metric value must be provided",
    },
  );
export type CreatePatientMetricValueInput = z.infer<
  typeof createPatientMetricValueSchema
>;

export const metricHistoryQuerySchema = z.object({
  categoryId: z.string().optional(),
  definitionId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
export type MetricHistoryQueryInput = z.infer<typeof metricHistoryQuerySchema>;
