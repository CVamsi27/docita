import { createZodDto } from 'nestjs-zod';
import {
  onboardingCompletionResponseSchema,
  onboardingInitResponseSchema,
  onboardingSessionSchema,
} from '@workspace/types';

export class OnboardingInitResponseDto extends createZodDto(
  onboardingInitResponseSchema,
) {}
export class OnboardingSessionResponseDto extends createZodDto(
  onboardingSessionSchema,
) {}

// This used to inline a flat `{accessToken, clinicId, userId, email, name,
// role}` schema. The service returns `OnboardingResult`, which is
// `{success, clinicId, userId, message, access_token, user, ...}`, so nothing
// matched: `SafeZodSerializerInterceptor` logged a mismatch warning on every
// successful clinic registration and passed the response through untrimmed.
// Wrapping the shared contract makes the annotation describe reality.
export class OnboardingCompletionResponseDto extends createZodDto(
  onboardingCompletionResponseSchema,
) {}
