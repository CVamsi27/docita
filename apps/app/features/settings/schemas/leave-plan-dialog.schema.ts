import { z } from "zod";
import { leaveTypeSchema } from "@workspace/types";

export const leavePlanDialogSchema = z.object({
  leaveType: leaveTypeSchema,
  annualQuota: z.coerce.number().int().min(1).max(365),
});

export type LeavePlanDialogFormValues = z.infer<typeof leavePlanDialogSchema>;
