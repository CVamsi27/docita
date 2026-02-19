import { z } from "zod";

export const contactInquirySchema = z.object({
    name: z.string(),
    email: z.string().email(),
    clinic: z.string().optional(),
    message: z.string(),
});

export const contactResponseSchema = z.object({
    success: z.boolean(),
    id: z.string(),
    message: z.string(),
});

export type ContactInquiry = z.infer<typeof contactInquirySchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
