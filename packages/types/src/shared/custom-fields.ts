import { z } from "zod";

export const customFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  fieldType: z.string(),
  options: z.string().nullable().optional(),
  required: z.boolean(),
  order: z.number().int(),
  clinicId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type CustomField = z.infer<typeof customFieldSchema>;

/**
 * Request contract for creating a custom field. Kept in sync with the API DTO
 * (apps/api/.../custom-fields.dto.ts CreateCustomFieldSchema).
 */
export const createCustomFieldRequestSchema = z.object({
  name: z.string().min(1),
  fieldType: z.string().min(1),
  options: z.string().optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type CreateCustomFieldRequest = z.infer<
  typeof createCustomFieldRequestSchema
>;

export const updateCustomFieldRequestSchema =
  createCustomFieldRequestSchema.partial();
export type UpdateCustomFieldRequest = z.infer<
  typeof updateCustomFieldRequestSchema
>;
