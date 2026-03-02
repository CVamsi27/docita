import { z } from "zod";

export const uploadSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  fileUrl: z.string().nullable().optional(),
  purpose: z.enum(["GENERAL", "DOCTOR_SIGNATURE"]).optional(),
  doctorId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  expiresAt: z.date().or(z.string()),
});

export type UploadSession = z.infer<typeof uploadSessionSchema>;
