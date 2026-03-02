import { z } from "zod";

export const auditLogSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  userId: z.string(),
  userName: z.string().optional(),
  userRole: z.string().optional(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  details: z.record(z.unknown()).optional(), 
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  status: z.string().optional(), 
  createdAt: z.date().or(z.string()),
});

export const auditLogFilterSchema = z.object({
  clinicId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional(),
  page: z.number().optional(),
});
