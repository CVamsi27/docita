import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
  route: z.string().default("PO"),

  // Hospital-Grade Drug Identification
  ndcCode: z.string().optional(), // National Drug Code
  rxNormCui: z.string().optional(), // RxNorm Concept Unique Identifier
  dosageForm: dosageFormSchema.optional(),
  strengthValue: z.number().optional(),
  strengthUnit: z.string().optional(), // e.g., "mg", "mL"

  // Prescription details
  quantity: z.number().optional(),
  refillsAllowed: z.number().min(0).max(11).optional(), // 0-11 refills
  dispenseAsWritten: z.boolean().optional(), // DAW flag
  sigCode: sigCodeSchema.optional(), // Standard sig code

  // Date tracking
  startDate: z.string().or(z.date()).optional(),
  endDate: z.string().or(z.date()).optional(),

  // PRN (as needed) medications
  isPRN: z.boolean().optional(),
  prnInstructions: z.string().optional(), // e.g., "Take for pain"
});
export type Medication = z.infer<typeof medicationSchema>;

