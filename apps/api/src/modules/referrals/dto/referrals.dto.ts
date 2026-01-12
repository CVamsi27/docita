import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const applyReferralSchema = z.object({
  referralCode: z.string(),
  email: z.string().email().optional(),
});

export class ApplyReferralDto extends createZodDto(applyReferralSchema) {}
