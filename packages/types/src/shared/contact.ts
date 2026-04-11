import { z } from "zod";

export const supportInquiryStatusSchema = z.enum([
  "NEW",
  "REVIEWED",
  "RESOLVED",
  "ARCHIVED",
]);

export const contactInquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  clinic: z.string().optional(),
  message: z.string().min(1),
});

export const contactResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string(),
});

export const supportInquirySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  clinic: z.string().nullable().optional(),
  message: z.string(),
  status: supportInquiryStatusSchema,
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const supportInquiryListResponseSchema = z.array(supportInquirySchema);

export type ContactInquiry = z.infer<typeof contactInquirySchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
export type SupportInquiry = z.infer<typeof supportInquirySchema>;
export type SupportInquiryStatus = z.infer<typeof supportInquiryStatusSchema>;
