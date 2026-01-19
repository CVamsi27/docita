import { z } from "zod";
import { clinicSchema } from "./clinics";
import { userSchema } from "./users";

export const onboardingStepSchema = z.enum(["clinic-details", "owner-details", "documents", "subscription", "review"]);
export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const onboardingSessionSchema = z.object({
    id: z.string(),
    currentStep: onboardingStepSchema,
    clinicDetails: clinicSchema.partial().optional(), // Define stricter if possible
    ownerDetails: userSchema.partial().optional(),
    isCompleted: z.boolean(),
    createdAt: z.date().or(z.string()),
    updatedAt: z.date().or(z.string()),
});

export const onboardingInitResponseSchema = z.object({
    onboardingId: z.string(),
    step: onboardingStepSchema,
});
