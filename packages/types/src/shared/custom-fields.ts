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
