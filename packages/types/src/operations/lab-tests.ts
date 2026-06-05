import { z } from "zod";

export const labTestOrderStatusSchema = z.enum([
  "ORDERED",
  "SAMPLE_COLLECTED",
  "PENDING",
  "RESULT_READY",
  "COMPLETED",
  "CANCELLED",
]);
export type LabTestOrderStatusValue = z.infer<typeof labTestOrderStatusSchema>;

export const labTypeSchema = z.enum(["INTERNAL", "EXTERNAL"]);
export type LabTypeValue = z.infer<typeof labTypeSchema>;

export const labSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string(),
  type: labTypeSchema,
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});
export type Lab = z.infer<typeof labSchema>;

export const labTestSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string(),
  code: z.string().nullable().optional(),
  loincCode: z.string().nullable().optional(),
  category: z.string(),
  price: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  referenceRangeLow: z.number().nullable().optional(),
  referenceRangeHigh: z.number().nullable().optional(),
  referenceRangeUnit: z.string().nullable().optional(),
  referenceRangeText: z.string().nullable().optional(),
  specimenType: z.string().nullable().optional(),
  collectionRequirements: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const labTestOrderSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  patientId: z.string(),
  appointmentId: z.string().nullable().optional(),
  labTestId: z.string(),
  labId: z.string().nullable().optional(),
  status: z.string(),
  result: z.unknown().nullable().optional(),
  resultUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  orderedBy: z.string(),
  collectedAt: z.date().or(z.string()).nullable().optional(),
  completedAt: z.date().or(z.string()).nullable().optional(),
  resultUploadedBy: z.string().nullable().optional(),
  resultUploadedAt: z.date().or(z.string()).nullable().optional(),
  paidAt: z.date().or(z.string()).nullable().optional(),
  paymentVerifiedBy: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  paymentReference: z.string().nullable().optional(),
  releasedAt: z.date().or(z.string()).nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  labTest: labTestSchema.optional(),
  lab: labSchema.optional(),
  doctor: z.object({ name: z.string() }).optional(),

  patient: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    })
    .optional(),
});

export type LabTest = z.infer<typeof labTestSchema>;
export type LabTestOrder = z.infer<typeof labTestOrderSchema>;
