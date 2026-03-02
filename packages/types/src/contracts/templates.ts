import { z } from "zod";

export const templateFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export const createTemplateRequestSchema = z.object({
  name: z.string().min(1, "Template name required"),
  speciality: z.string().min(1, "Speciality required"),
  fields: z.array(z.record(z.unknown())).min(1, "At least one field required"),
  defaultObservations: z.string().optional(),
  clinicId: z.string().optional(),
});

export const updateTemplateRequestSchema = createTemplateRequestSchema.partial();

export const listTemplatesQuerySchema = z.object({
  search: z.string().optional(),
  speciality: z.string().optional(),
});

export const templateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  speciality: z.string(),
  defaultObservations: z.string().default(""),
  fields: z.array(z.record(z.unknown())).default([]),
  userId: z.string().optional(),
  clinicId: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]).optional(),
  updatedAt: z.union([z.string(), z.date()]).optional(),
});

export const listTemplatesResponseSchema = z.array(templateResponseSchema);

export type CreateTemplateRequest = z.infer<typeof createTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof updateTemplateRequestSchema>;
export type ListTemplatesContractQuery = z.infer<typeof listTemplatesQuerySchema>;
export type TemplateContractResponse = z.infer<typeof templateResponseSchema>;
