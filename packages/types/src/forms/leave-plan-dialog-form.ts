import { z } from "zod";
import { leaveTypeSchema } from "../leave/leave";

// allow-no-base-schema: owner=leave reason=ui-plan-dialog review=2026-09-30
export const leavePlanDialogFormSchema = z.object({
  leaveType: leaveTypeSchema,
  annualQuota: z.coerce.number().int().min(1).max(365),
});

export type LeavePlanDialogFormValues = z.infer<
  typeof leavePlanDialogFormSchema
>;
