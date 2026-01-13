import { z } from "zod";

export const DoctorClinicSchema = z.object({
    doctorId: z.string(),
    clinicId: z.string(),
    role: z.string(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export type DoctorClinic = z.infer<typeof DoctorClinicSchema>;
