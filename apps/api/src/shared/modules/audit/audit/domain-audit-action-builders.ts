import type { AuditLogData } from './audit.service.types';

export type UserActionType =
  | 'PROFILE_UPDATE'
  | 'ROLE_CHANGE'
  | 'PASSWORD_CHANGE';

export function buildUserActionLog(args: {
  userId: string;
  clinicId: string;
  actionType: UserActionType;
  changes: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.actionType,
    resourceType: 'User',
    resourceId: args.userId,
    changes: args.changes,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
  };
}

export type PrescriptionActionType =
  | 'PRESCRIPTION_CREATE'
  | 'PRESCRIPTION_UPDATE'
  | 'PRESCRIPTION_APPROVE'
  | 'PRESCRIPTION_DELETE';

export function buildPrescriptionActionLog(args: {
  userId: string;
  clinicId: string;
  actionType: PrescriptionActionType;
  prescriptionId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.actionType,
    resourceType: 'Prescription',
    resourceId: args.prescriptionId,
    changes: args.changes,
    ipAddress: args.ipAddress,
  };
}

export type PaymentActionType =
  | 'PAYMENT_RETRY'
  | 'PAYMENT_REFUND'
  | 'PAYMENT_FAILED';

export function buildPaymentActionLog(args: {
  userId: string;
  clinicId: string;
  actionType: PaymentActionType;
  invoiceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.actionType,
    resourceType: 'Invoice',
    resourceId: args.invoiceId,
    changes: args.changes,
    ipAddress: args.ipAddress,
  };
}

export type AppointmentActionType =
  | 'APPOINTMENT_CANCEL'
  | 'APPOINTMENT_NO_SHOW';

export function buildAppointmentActionLog(args: {
  userId: string;
  clinicId: string;
  actionType: AppointmentActionType;
  appointmentId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.actionType,
    resourceType: 'Appointment',
    resourceId: args.appointmentId,
    changes: args.changes,
    ipAddress: args.ipAddress,
  };
}

export type AdminActionType =
  | 'ADMIN_CREATE'
  | 'ADMIN_UPDATE'
  | 'ADMIN_DELETE'
  | 'ADMIN_ROLE_CHANGE';

export function buildAdminActionLog(args: {
  userId: string;
  clinicId: string;
  actionType: AdminActionType;
  adminId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.actionType,
    resourceType: 'Admin',
    resourceId: args.adminId,
    changes: args.changes,
    ipAddress: args.ipAddress,
  };
}

export function buildDataExportLog(args: {
  userId: string;
  clinicId: string;
  entityType: string;
  recordCount: number;
  ipAddress?: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: 'DATA_EXPORT',
    resourceType: args.entityType,
    resourceId: args.clinicId,
    metadata: { recordCount: args.recordCount },
    ipAddress: args.ipAddress,
  };
}

export type PatientAccessType = 'VIEW_HISTORY' | 'VIEW_PROFILE' | 'EXPORT_DATA';

export function buildPatientAccessLog(args: {
  userId: string;
  clinicId: string;
  patientId: string;
  accessType: PatientAccessType;
  ipAddress?: string;
  userAgent?: string;
  accessTime: string;
}): AuditLogData {
  return {
    userId: args.userId,
    clinicId: args.clinicId,
    actionType: args.accessType,
    resourceType: 'Patient',
    resourceId: args.patientId,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
    metadata: { accessTime: args.accessTime },
  };
}
