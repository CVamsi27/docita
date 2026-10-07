import type { OnboardingCompletionResponse } from '@workspace/types';

/**
 * Outcome of `POST /onboarding/:id/complete`.
 *
 * Derived from the shared contract rather than restated, so the service's
 * return value, the controller's `@ZodSerializerDto` annotation and the SPA's
 * parse all describe the same shape.
 */
export type OnboardingResult = OnboardingCompletionResponse;
