import { describe, expect, it } from '@jest/globals';
import {
  buildAdminActionLog,
  buildAppointmentActionLog,
  buildDataExportLog,
  buildPatientAccessLog,
  buildPaymentActionLog,
  buildPrescriptionActionLog,
  buildUserActionLog,
} from './domain-audit-action-builders';

describe('buildUserActionLog', () => {
  it('maps PROFILE_UPDATE to a User resource entry', () => {
    const result = buildUserActionLog({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PROFILE_UPDATE',
      changes: { name: { from: 'A', to: 'B' } },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toEqual({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PROFILE_UPDATE',
      resourceType: 'User',
      resourceId: 'user-1',
      changes: { name: { from: 'A', to: 'B' } },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
  });
});

describe('buildPrescriptionActionLog', () => {
  it('preserves the prescription id as resourceId and omits userAgent', () => {
    const result = buildPrescriptionActionLog({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PRESCRIPTION_APPROVE',
      prescriptionId: 'rx-99',
      changes: { status: 'approved' },
      ipAddress: '10.0.0.1',
    });

    expect(result).toEqual({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PRESCRIPTION_APPROVE',
      resourceType: 'Prescription',
      resourceId: 'rx-99',
      changes: { status: 'approved' },
      ipAddress: '10.0.0.1',
    });
    expect(result).not.toHaveProperty('userAgent');
  });
});

describe('buildPaymentActionLog', () => {
  it('uses Invoice as the resourceType with the invoice id', () => {
    const result = buildPaymentActionLog({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PAYMENT_REFUND',
      invoiceId: 'inv-1',
      changes: { amount: 500 },
    });

    expect(result).toEqual({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'PAYMENT_REFUND',
      resourceType: 'Invoice',
      resourceId: 'inv-1',
      changes: { amount: 500 },
      ipAddress: undefined,
    });
  });
});

describe('buildAppointmentActionLog', () => {
  it('uses Appointment as resource type with appointment id', () => {
    const result = buildAppointmentActionLog({
      userId: 'doctor-1',
      clinicId: 'clinic-1',
      actionType: 'APPOINTMENT_CANCEL',
      appointmentId: 'apt-42',
      changes: { reason: 'patient unavailable' },
    });

    expect(result).toEqual({
      userId: 'doctor-1',
      clinicId: 'clinic-1',
      actionType: 'APPOINTMENT_CANCEL',
      resourceType: 'Appointment',
      resourceId: 'apt-42',
      changes: { reason: 'patient unavailable' },
      ipAddress: undefined,
    });
  });
});

describe('buildAdminActionLog', () => {
  it('uses Admin as resource type and adminId as resourceId', () => {
    const result = buildAdminActionLog({
      userId: 'super-1',
      clinicId: 'clinic-1',
      actionType: 'ADMIN_ROLE_CHANGE',
      adminId: 'admin-2',
      changes: { from: 'VIEWER', to: 'EDITOR' },
    });

    expect(result.resourceType).toBe('Admin');
    expect(result.resourceId).toBe('admin-2');
    expect(result.actionType).toBe('ADMIN_ROLE_CHANGE');
    expect(result.changes).toEqual({ from: 'VIEWER', to: 'EDITOR' });
  });
});

describe('buildDataExportLog', () => {
  it('uses DATA_EXPORT action with the entityType and record count in metadata', () => {
    const result = buildDataExportLog({
      userId: 'user-1',
      clinicId: 'clinic-1',
      entityType: 'Patient',
      recordCount: 42,
      ipAddress: '127.0.0.1',
    });

    expect(result).toEqual({
      userId: 'user-1',
      clinicId: 'clinic-1',
      actionType: 'DATA_EXPORT',
      resourceType: 'Patient',
      resourceId: 'clinic-1',
      metadata: { recordCount: 42 },
      ipAddress: '127.0.0.1',
    });
  });
});

describe('buildPatientAccessLog', () => {
  it('uses Patient as resource with the patient id and the access time in metadata', () => {
    const result = buildPatientAccessLog({
      userId: 'doctor-1',
      clinicId: 'clinic-1',
      patientId: 'patient-1',
      accessType: 'VIEW_HISTORY',
      ipAddress: '10.0.0.1',
      userAgent: 'safari',
      accessTime: '2026-06-08T12:00:00.000Z',
    });

    expect(result).toEqual({
      userId: 'doctor-1',
      clinicId: 'clinic-1',
      actionType: 'VIEW_HISTORY',
      resourceType: 'Patient',
      resourceId: 'patient-1',
      ipAddress: '10.0.0.1',
      userAgent: 'safari',
      metadata: { accessTime: '2026-06-08T12:00:00.000Z' },
    });
  });
});
