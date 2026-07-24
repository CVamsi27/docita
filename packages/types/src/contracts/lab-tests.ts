import { z } from "zod";
import {
  labSchema,
  labTestOrderSchema,
  labTestSchema,
  labTypeSchema,
} from "../operations/lab-tests";
import { markInvoicePaidPaymentMethodSchema } from "./billing";
import { paginatedResponseSchema } from "../api/api-response";

export const labTestResponseSchema = labTestSchema;
export const labTestOrderResponseSchema = labTestOrderSchema;
export const labResponseSchema = labSchema;

export const createLabTestRequestSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  clinicId: z.string().optional(),
  active: z.boolean().optional(),
  code: z.string().optional(),
  price: z.number().optional(),
  description: z.string().optional(),
});

export const updateLabTestRequestSchema = createLabTestRequestSchema
  .omit({ clinicId: true })
  .partial();

export const createLabTestOrderRequestSchema = z.object({
  patientId: z.string(),
  labTestId: z.string(),
  clinicId: z.string().optional(),
  appointmentId: z.string().optional(),
  labId: z.string().optional(),
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
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

export const listLabTestOrdersResponseSchema =
  paginatedResponseSchema(labTestOrderSchema);

export const labStatsQuerySchema = z.object({
  clinicId: z.string().optional(),
});

/** Lab workspace queue: orders assigned to the caller's lab, filterable by status. */
export const listLabQueueQuerySchema = z.object({
  labId: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

/** Record that the physical sample was received/collected by the lab. */
export const recordSampleCollectionRequestSchema = z.object({
  notes: z.string().max(500).optional(),
});

/**
 * Lab uploads a result. The report file is sent as multipart form-data; this
 * body carries optional metadata fields alongside it.
 */
export const uploadLabResultRequestSchema = z.object({
  notes: z.string().max(500).optional(),
});

/** Payment verified at the hospital front desk for a lab order. */
export const verifyLabOrderPaymentRequestSchema = z.object({
  paymentMethod: markInvoicePaidPaymentMethodSchema.default("CASH"),
  reference: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const createLabRequestSchema = z.object({
  name: z.string().min(1),
  type: labTypeSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
});

export const updateLabRequestSchema = createLabRequestSchema
  .partial()
  .extend({ active: z.boolean().optional() });

export type ListLabQueueQuery = z.infer<typeof listLabQueueQuerySchema>;
export type RecordSampleCollectionRequest = z.infer<
  typeof recordSampleCollectionRequestSchema
>;
export type UploadLabResultRequest = z.infer<
  typeof uploadLabResultRequestSchema
>;
export type VerifyLabOrderPaymentRequest = z.infer<
  typeof verifyLabOrderPaymentRequestSchema
>;
export type CreateLabRequest = z.infer<typeof createLabRequestSchema>;
export type UpdateLabRequest = z.infer<typeof updateLabRequestSchema>;
export type LabContractResponse = z.infer<typeof labResponseSchema>;

export type LabTestContractResponse = z.infer<typeof labTestResponseSchema>;
export type LabTestOrderContractResponse = z.infer<
  typeof labTestOrderResponseSchema
>;
export type CreateLabTestRequest = z.infer<typeof createLabTestRequestSchema>;
export type UpdateLabTestRequest = z.infer<typeof updateLabTestRequestSchema>;
export type CreateLabTestOrderRequest = z.infer<
  typeof createLabTestOrderRequestSchema
>;
export type UpdateLabTestOrderRequest = z.infer<
  typeof updateLabTestOrderRequestSchema
>;
export type ListLabTestOrdersContractQuery = z.infer<
  typeof listLabTestOrdersQuerySchema
>;
export type ListLabTestOrdersResponse = z.infer<
  typeof listLabTestOrdersResponseSchema
>;
