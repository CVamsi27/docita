import { z } from "zod";
import { sidebarNavOrderSchema } from "../shared/sidebar-nav";

export const updateProfileRequestSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    sidebarNavOrderOverride: sidebarNavOrderSchema.nullable().optional(),
  })
  .refine((data) => data.name || data.email || data.sidebarNavOrderOverride !== undefined, {
    message: "Update at least one field before saving.",
  });

export const userProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  sidebarNavOrderOverride: sidebarNavOrderSchema.nullable().optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type UserProfileResponse = z.infer<typeof userProfileResponseSchema>;

export const staffAccountDeletionRequestSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
  confirmDeletion: z.literal(true),
});

export const staffAccountDeletionResponseSchema = z.object({
  message: z.string(),
  userId: z.string(),
  requestedAt: z.string(),
});

export type StaffAccountDeletionRequest = z.infer<
  typeof staffAccountDeletionRequestSchema
>;
export type StaffAccountDeletionResponse = z.infer<
  typeof staffAccountDeletionResponseSchema
>;
