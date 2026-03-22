import { z } from "zod";
import { leaveTypeSchema } from "./leave";

export const leavePlanSchema = z.object({
  id: z.string().optional(),
  clinicId: z.string().min(1),
  leaveType: leaveTypeSchema,
  annualQuota: z.number().int().min(0).max(365),
  carryForward: z.boolean().default(false),
  maxCarryForward: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
});
export type LeavePlan = z.infer<typeof leavePlanSchema>;

export const createLeavePlanSchema = leavePlanSchema.omit({
  id: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateLeavePlan = z.infer<typeof createLeavePlanSchema>;

export const updateLeavePlanSchema = createLeavePlanSchema.partial();
export type UpdateLeavePlan = z.infer<typeof updateLeavePlanSchema>;
