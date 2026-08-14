export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',

  CLINIC_CREATED = 'CLINIC_CREATED',
  CLINIC_UPDATED = 'CLINIC_UPDATED',
  CLINIC_SETTINGS_CHANGED = 'CLINIC_SETTINGS_CHANGED',

  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_EXPORTED = 'PATIENT_EXPORTED',

  PRESCRIPTION_CREATED = 'PRESCRIPTION_CREATED',
  PRESCRIPTION_UPDATED = 'PRESCRIPTION_UPDATED',
  PRESCRIPTION_DELETED = 'PRESCRIPTION_DELETED',
  CONSULTATION_CREATED = 'CONSULTATION_CREATED',
  CONSULTATION_UPDATED = 'CONSULTATION_UPDATED',

  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',

  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_PAID = 'INVOICE_PAID',
  REFUND_ISSUED = 'REFUND_ISSUED',

  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',

  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  SYSTEM_SETTING_CHANGED = 'SYSTEM_SETTING_CHANGED',

  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  BACKUP_CREATED = 'BACKUP_CREATED',

  SECURITY_POLICY_CHANGED = 'SECURITY_POLICY_CHANGED',
  EMERGENCY_ACCESS_GRANTED = 'EMERGENCY_ACCESS_GRANTED',
  EMERGENCY_ACCESS_REVOKED = 'EMERGENCY_ACCESS_REVOKED',

  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  API_KEY_ROTATED = 'API_KEY_ROTATED',

  DOCTOR_VERIFICATION_OVERRIDDEN = 'DOCTOR_VERIFICATION_OVERRIDDEN',
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  clinicId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  failureReason?: string;
}

/**
 * Subset of Prisma.TransactionClient the audit logger needs. Typed
 * structurally so the interface file stays free of the Prisma import
 * (it is consumed by domains that should not depend on Prisma directly).
 */
export interface AuditTransactionClient {
  auditLog: {
    create: (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
}

export interface IAuditLogger {
  /**
   * Append an audit log row.
   *
   * If `tx` is supplied, the write joins the caller's Prisma transaction:
   * a rollback of the mutation rolls back the audit row, and a failed
   * audit insert rolls back the mutation. Callers that need the audit
   * row to survive independently of their write (auth events, read
   * audits) should omit `tx` — the logger then uses the singleton
   * Prisma client and rethrows on failure.
   */
  log(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
    tx?: AuditTransactionClient,
  ): Promise<void>;
  /**
   * Fire-and-forget write. Useful for read-audits, login attempts, and
   * other entries where blocking the caller on the audit insert is worse
   * than losing the audit row on failure. The promise resolves once the
   * write is scheduled; errors are caught and logged, never rethrown.
   */
  logAsync?(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void;
  getLogsForResource(
    resourceType: string,
    resourceId: string,
  ): Promise<AuditLogEntry[]>;
  getLogsForUser(userId: string, clinicId: string): Promise<AuditLogEntry[]>;
  getLogsForClinic(clinicId: string): Promise<AuditLogEntry[]>;
  getLogsForAction(
    action: AuditAction,
    clinicId: string,
  ): Promise<AuditLogEntry[]>;
  deleteOldLogs(olderThanDays: number): Promise<number>;
}
