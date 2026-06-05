import { z } from "zod";
import { claimTypeSchema } from "../billing/insurance-claims";

/**
 * react-hook-form schemas for the insurance-claims feature. Amounts are
 * entered in major units (rupees) and converted to minor units (paise) at the
 * API boundary, mirroring how invoice forms handle prices.
 */

export const createInsuranceClaimFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  claimType: claimTypeSchema,
  invoiceId: z.string().optional(),
  appointmentId: z.string().optional(),
  insurerName: z.string().min(1, "Enter the insurer name"),
  tpaName: z.string().optional(),
  policyNumber: z.string().min(1, "Enter the policy number"),
  groupNumber: z.string().optional(),
  claimedAmount: z.number().min(0, "Enter a valid amount"),
  notes: z.string().optional(),
});

export const editInsuranceClaimFormSchema = createInsuranceClaimFormSchema
  .omit({ patientId: true, claimType: true })
  .extend({
    approvedAmount: z.number().min(0).optional(),
    patientResponsibility: z.number().min(0).optional(),
  });

export type CreateInsuranceClaimFormValues = z.infer<
  typeof createInsuranceClaimFormSchema
>;
export type EditInsuranceClaimFormValues = z.infer<
  typeof editInsuranceClaimFormSchema
>;
