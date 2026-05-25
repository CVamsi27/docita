import { z } from "zod";

export const createLabTestOrderFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  labTestId: z.string().min(1, "Select a test"),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateLabTestOrderFormValues = z.infer<
  typeof createLabTestOrderFormSchema
>;
