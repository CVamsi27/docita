import { z } from "zod";

export const leaveTypeSchema = z.enum([
  "CASUAL",
  "SICK",
  "EARNED",
  "COMP_OFF",
  "UNPAID",
  "HOLIDAY",
]);
export type LeaveType = z.infer<typeof leaveTypeSchema>;

export const leaveStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;

export const staffLeaveSchema = z.object({
  id: z.string().optional(),
  staffId: z.string().min(1),
  clinicId: z.string().min(1),
  leaveType: leaveTypeSchema,
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  reason: z.string().max(500).optional(),
  status: leaveStatusSchema.default("PENDING"),
  approvedBy: z.string().optional(),
  approvedAt: z.string().or(z.date()).optional(),
  rejectionReason: z.string().max(500).optional(),
  cancelledAt: z.string().or(z.date()).optional(),
  createdAt: z.string().or(z.date()).optional(),
  updatedAt: z.string().or(z.date()).optional(),
  staff: z
    .object({ id: z.string(), name: z.string(), email: z.string() })
    .optional(),
  approver: z
    .object({ id: z.string(), name: z.string() })
    .optional()
    .nullable(),
});
export type StaffLeave = z.infer<typeof staffLeaveSchema>;

export const createLeaveRequestSchema = z
  .object({
    leaveType: leaveTypeSchema,
    startDate: z.string().min(1, "Choose a start date."),
    endDate: z.string().min(1, "Choose an end date."),
    reason: z.string().max(500).optional(),
    staffId: z.string().optional(),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    },
  );
export type CreateLeaveRequest = z.infer<typeof createLeaveRequestSchema>;

export const leaveBalanceSchema = z.object({
  leaveType: leaveTypeSchema,
  annualQuota: z.number().int(),
  used: z.number().int(),
  remaining: z.number().int(),
  pending: z.number().int(),
});
export type LeaveBalance = z.infer<typeof leaveBalanceSchema>;
