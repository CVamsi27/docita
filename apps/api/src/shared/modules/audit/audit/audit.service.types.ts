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

export interface AuditLogFilter {
  clinicId?: string;
  userId?: string;
  actionType?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}
