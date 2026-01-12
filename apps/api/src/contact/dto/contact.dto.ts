import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ContactInquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  clinic: z.string().optional(),
  message: z.string().min(1),
});
export class ContactInquiryDto extends createZodDto(ContactInquirySchema) {}
