import { z } from "zod";

export const chooseOnboardingPathSchema = z.object({
  path: z.enum(["CREATE_CLINIC", "JOIN_CLINIC"]),
});

export type ChooseOnboardingPath = z.infer<typeof chooseOnboardingPathSchema>;
