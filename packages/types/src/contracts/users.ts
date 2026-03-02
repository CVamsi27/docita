import { z } from "zod";

export const updateProfileRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.name || data.email, {
    message: "At least one field (name or email) is required",
  });

export const userProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;
