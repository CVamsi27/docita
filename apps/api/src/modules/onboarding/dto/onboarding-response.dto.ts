import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  onboardingInitResponseSchema,
  onboardingSessionSchema,
} from '@workspace/types';

export class OnboardingInitResponseDto extends createZodDto(
  onboardingInitResponseSchema,
) {}
export class OnboardingSessionResponseDto extends createZodDto(
  onboardingSessionSchema,
) {}

export class OnboardingCompletionResponseDto extends createZodDto(
  z.object({
    accessToken: z.string(),
    clinicId: z.string(),
    userId: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string(),
  }),
) {}
