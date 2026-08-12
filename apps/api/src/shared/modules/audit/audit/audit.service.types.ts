export interface AuditLogData {
  clinicId: string;
  userId: string;
  actionType: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Return shape of `AuditService.createAuditLog`. The function is
 * private to the service, but the type is exported so callers that
 * spy on it from a test can assert against a typed result without
 * falling back to `Record<string, unknown>`.
 */
export type CreatedAuditLog = AuditLogData & {
  id: string;
  createdAt: Date;
};

export interface AuditLogFilter {
  clinicId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}
