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
export type CreateMetricCategoryInput = z.infer<
  typeof createMetricCategorySchema
>;

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
      message: "Enter at least one metric value.",
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

export const metricOptionResponseSchema = z.object({
  id: z.string(),
  definitionId: z.string().optional(),
  value: z.string(),
  label: z.string(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type MetricOptionResponse = z.infer<typeof metricOptionResponseSchema>;

export const metricDefinitionResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable().optional(),
  valueType: z.string().optional(),
  unit: z.string().nullable().optional(),
  cardinality: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
  isCustom: z.boolean().optional(),
  isPatientScoped: z.boolean().optional(),
  patientId: z.string().nullable().optional(),
  isTrackedByDefault: z.boolean().optional(),
  isTracked: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  metricOptions: z.array(metricOptionResponseSchema).optional(),
  category: z
    .object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
    })
    .optional(),
});
export type MetricDefinitionResponse = z.infer<
  typeof metricDefinitionResponseSchema
>;

export const metricCategoryResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string().optional(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  order: z.number().int().optional(),
  isSystem: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  metricDefinitions: z.array(metricDefinitionResponseSchema).default([]),
});
export type MetricCategoryResponse = z.infer<
  typeof metricCategoryResponseSchema
>;

export const metricRecordValueResponseSchema = z.object({
  id: z.string(),
  metricRecordId: z.string().optional(),
  valueString: z.string().nullable().optional(),
  valueNumber: z.number().nullable().optional(),
  valueBoolean: z.boolean().nullable().optional(),
  valueDate: z.string().or(z.date()).nullable().optional(),
  valueJson: z.record(z.unknown()).nullable().optional(),
  optionId: z.string().nullable().optional(),
  option: metricOptionResponseSchema.nullable().optional(),
});
export type MetricRecordValueResponse = z.infer<
  typeof metricRecordValueResponseSchema
>;

export const metricRecordResponseSchema = z.object({
  id: z.string(),
  clinicId: z.string().optional(),
  patientId: z.string().optional(),
  definitionId: z.string().optional(),
  appointmentId: z.string().nullable().optional(),
  recordedAt: z.string().or(z.date()),
  recordedById: z.string().nullable().optional(),
  source: z.string().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  definition: metricDefinitionResponseSchema.extend({
    category: z.object({
      id: z.string().optional(),
      key: z.string(),
      name: z.string().optional(),
    }),
  }),
  values: z.array(metricRecordValueResponseSchema).default([]),
});
export type MetricRecordResponse = z.infer<typeof metricRecordResponseSchema>;

export const metricHistoryResponseSchema = z.object({
  total: z.number().int(),
  timeline: z.array(metricRecordResponseSchema),
  byCategory: z.record(z.array(metricRecordResponseSchema)),
});
export type MetricHistoryResponse = z.infer<typeof metricHistoryResponseSchema>;
