import { z } from "zod";

export const chooseOnboardingPathSchema = z.object({
  path: z.enum(["CREATE_CLINIC", "JOIN_CLINIC"]),
});

export type ChooseOnboardingPath = z.infer<typeof chooseOnboardingPathSchema>;

export const onboardingTrialEligibilityResponseSchema = z.object({
  eligible: z.boolean(),
});

export type OnboardingTrialEligibilityResponse = z.infer<
  typeof onboardingTrialEligibilityResponseSchema
>;

/**
 * Response of `POST /onboarding/:id/checkout`.
 *
 * This lived in an API DTO file, so the SPA hand-wrote a second
 * `OnboardingCheckoutResponse` interface and never parsed anything — two
 * sources of truth for the same four fields (AGENTS §3.2). It also used
 * `razorpayKeyId: z.string()`, which silently accepted the `|| ''` the service
 * returns when `RAZORPAY_KEY_ID` is unset. That produced a checkout the SPA
 * happily handed to Razorpay with an empty key: a modal that can never
 * complete, behind an order the API had already created. The key is required
 * to be non-empty, so the failure surfaces as a loud parse error or a service
 * error instead of a dead-end payment screen.
 */
export const onboardingCheckoutResponseSchema = z.object({
  orderId: z.string(),
  amountCents: z.number().int(),
  currency: z.string(),
  razorpayKeyId: z.string().min(1),
});

export type OnboardingCheckoutResponse = z.infer<
  typeof onboardingCheckoutResponseSchema
>;
