import { z } from "zod";

export const ipdAdmissionFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  wardId: z.string().min(1, "Select a ward"),
  bedId: z.string().min(1, "Select a bed"),
  attendingDoctorId: z.string().min(1, "Select the attending doctor"),
  diagnosis: z
    .string()
    .trim()
    .min(1, "Enter the admission diagnosis"),
  notes: z.string().optional(),
});

export type IpdAdmissionFormValues = z.infer<typeof ipdAdmissionFormSchema>;

/** @deprecated Use IpdAdmissionFormValues */
export type AdmissionFormData = IpdAdmissionFormValues;
