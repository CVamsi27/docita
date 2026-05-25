import { z } from "zod";
import { leaveTypeSchema } from "../leave/leave";

export const leavePlanDialogFormSchema = z.object({
  leaveType: leaveTypeSchema,
  annualQuota: z.coerce.number().int().min(1).max(365),
});

export type LeavePlanDialogFormValues = z.infer<
  typeof leavePlanDialogFormSchema
>;
