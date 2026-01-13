import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  referralCodeSchema,
  referralStatsSchema,
  referralUsageSchema,
  referralValidationSchema,
} from '@workspace/types';

export const applyReferralSchema = z.object({
  referralCode: z.string(),
  email: z.string().email().optional(),
});

export class ApplyReferralDto extends createZodDto(applyReferralSchema) {}

export class ReferralCodeResponseDto extends createZodDto(referralCodeSchema) {}
export class ReferralStatsResponseDto extends createZodDto(
  referralStatsSchema,
) {}
export class ReferralHistoryListResponseDto extends createZodDto(
  z.array(referralUsageSchema),
) {}
export class ReferralValidationResponseDto extends createZodDto(
  referralValidationSchema,
) {}
export class ReferralDiscountResponseDto extends createZodDto(
  z.object({ discount: z.number() }),
) {}
