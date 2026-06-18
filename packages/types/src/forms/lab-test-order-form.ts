import { z } from "zod";

// allow-no-base-schema: owner=lab-tests reason=ui-order-selector-form review=2026-09-30
export const createLabTestOrderFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  labTestId: z.string().min(1, "Select a test"),
  appointmentId: z.string().optional(),
  labId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateLabTestOrderFormValues = z.infer<
  typeof createLabTestOrderFormSchema
>;
