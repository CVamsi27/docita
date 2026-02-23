/**
 * Audit Logger Service Interface
 * 
 * Provides standardized audit logging for compliance and security.
 * Logs sensitive operations with user context, timestamps, and changes.
 */

export enum AuditAction {
  // User actions
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',

  // Clinic actions
  CLINIC_CREATED = 'CLINIC_CREATED',
  CLINIC_UPDATED = 'CLINIC_UPDATED',
  CLINIC_SETTINGS_CHANGED = 'CLINIC_SETTINGS_CHANGED',

  // Patient actions
  PATIENT_CREATED = 'PATIENT_CREATED',
  PATIENT_UPDATED = 'PATIENT_UPDATED',
  PATIENT_DELETED = 'PATIENT_DELETED',
  PATIENT_EXPORTED = 'PATIENT_EXPORTED',

  // Clinical actions
  PRESCRIPTION_CREATED = 'PRESCRIPTION_CREATED',
  PRESCRIPTION_UPDATED = 'PRESCRIPTION_UPDATED',
  PRESCRIPTION_DELETED = 'PRESCRIPTION_DELETED',
  CONSULTATION_CREATED = 'CONSULTATION_CREATED',
  CONSULTATION_UPDATED = 'CONSULTATION_UPDATED',

  // Appointment actions
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',

  // Billing actions
  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_PAID = 'INVOICE_PAID',
  REFUND_ISSUED = 'REFUND_ISSUED',

  // Subscription actions
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',

  // Admin actions
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  SYSTEM_SETTING_CHANGED = 'SYSTEM_SETTING_CHANGED',

  // Data actions
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  BACKUP_CREATED = 'BACKUP_CREATED',

  // Security actions
  SECURITY_POLICY_CHANGED = 'SECURITY_POLICY_CHANGED',
  EMERGENCY_ACCESS_GRANTED = 'EMERGENCY_ACCESS_GRANTED',
  EMERGENCY_ACCESS_REVOKED = 'EMERGENCY_ACCESS_REVOKED',

  // API actions
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_DELETED = 'API_KEY_DELETED',
  API_KEY_ROTATED = 'API_KEY_ROTATED',
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  clinicId: string;
  action: AuditAction;
  resourceType: string; // 'User', 'Patient', 'Appointment', etc.
  resourceId?: string;
  changes?: Record<string, { before: any; after: any }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  failureReason?: string;
}

export interface IAuditLogger {
  log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
  getLogsForResource(resourceType: string, resourceId: string): Promise<AuditLogEntry[]>;
  getLogsForUser(userId: string, clinicId: string): Promise<AuditLogEntry[]>;
  getLogsForClinic(clinicId: string): Promise<AuditLogEntry[]>;
  getLogsForAction(action: AuditAction, clinicId: string): Promise<AuditLogEntry[]>;
  deleteOldLogs(olderThanDays: number): Promise<number>;
}
