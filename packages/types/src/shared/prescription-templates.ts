import { z } from "zod";
import { userSchema } from "./users";
import { embeddedMedicationSchema } from "../clinical/medications";

export const prescriptionTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  user: userSchema.optional(),
  medications: z.array(embeddedMedicationSchema),
  instructions: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type PrescriptionTemplate = z.infer<typeof prescriptionTemplateSchema>;
