import { z } from "zod";

export const onboardingStepSchema = z.enum(["clinic-details", "owner-details", "documents", "subscription", "review"]);
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingSessionSchema = z.object({
    id: z.string(),
    currentStep: onboardingStepSchema,
    clinicDetails: z.any().optional(), // Define stricter if possible
    ownerDetails: z.any().optional(),
    isCompleted: z.boolean(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const onboardingInitResponseSchema = z.object({
    onboardingId: z.string(),
    step: onboardingStepSchema,
});
