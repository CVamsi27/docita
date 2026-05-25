import { z } from "zod";
import { labTestOrderSchema, labTestSchema } from "../operations/lab-tests";

export const labTestResponseSchema = labTestSchema;
export const labTestOrderResponseSchema = labTestOrderSchema;

export const createLabTestRequestSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  clinicId: z.string().optional(),
  active: z.boolean().optional(),
  code: z.string().optional(),
  price: z.number().optional(),
  description: z.string().optional(),
});

export const createLabTestOrderRequestSchema = z.object({
  patientId: z.string(),
  labTestId: z.string(),
  clinicId: z.string().optional(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateLabTestOrderRequestSchema = z.object({
  status: z.string().optional(),
  result: z.record(z.unknown()).optional(),
  resultUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const listLabTestOrdersQuerySchema = z.object({
  clinicId: z.string().optional(),
  patientId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
});

export const labStatsQuerySchema = z.object({
  clinicId: z.string().optional(),
});

export type LabTestContractResponse = z.infer<typeof labTestResponseSchema>;
export type LabTestOrderContractResponse = z.infer<
  typeof labTestOrderResponseSchema
>;
export type CreateLabTestRequest = z.infer<typeof createLabTestRequestSchema>;
export type CreateLabTestOrderRequest = z.infer<
  typeof createLabTestOrderRequestSchema
>;
export type UpdateLabTestOrderRequest = z.infer<
  typeof updateLabTestOrderRequestSchema
>;
export type ListLabTestOrdersContractQuery = z.infer<
  typeof listLabTestOrdersQuerySchema
>;
