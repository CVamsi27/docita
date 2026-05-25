export interface InternalAuditLog {
  id: string;
  clinicId: string;
  userId: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
