import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { ArchivalService } from './archival.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { DataRetentionScheduler } from './data-retention.scheduler';

const THIRTY_DAYS_AGO = new Date('2026-05-13T00:00:00.000Z');

type PatientRow = { id: string; clinicId: string | null };
type UserRow = { id: string; clinicId: string | null; createdAt?: Date };

describe('DataRetentionScheduler', () => {
  const runUnrestrictedMock =
    jest.fn<(cb: () => Promise<unknown>) => Promise<unknown>>();
  const patientFindManyMock =
    jest.fn<(args?: unknown) => Promise<PatientRow[]>>();
  const patientUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();
  const userFindManyMock = jest.fn<(args?: unknown) => Promise<UserRow[]>>();
  const userUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();
  const auditLogActionMock = jest.fn<AuditService['logAction']>();
  const archiveAuditLogsMock = jest.fn<ArchivalService['archiveAuditLogs']>();
  const archiveWhatsappLogsMock =
    jest.fn<ArchivalService['archiveWhatsappLogs']>();
  const archiveAppointmentsMock =
    jest.fn<ArchivalService['archiveAppointments']>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    runUnrestricted: {
      value: runUnrestrictedMock.mockImplementation(
        async (cb: () => Promise<unknown>) => cb(),
      ),
      writable: true,
    },
    patient: {
      value: { findMany: patientFindManyMock, update: patientUpdateMock },
      writable: true,
    },
    user: {
      value: { findMany: userFindManyMock, update: userUpdateMock },
      writable: true,
    },
  });

  const auditService = Object.create(AuditService.prototype) as AuditService;
  auditService.logAction = auditLogActionMock;

  const archivalService = Object.create(
    ArchivalService.prototype,
  ) as ArchivalService;
  archivalService.archiveAuditLogs = archiveAuditLogsMock;
  archivalService.archiveWhatsappLogs = archiveWhatsappLogsMock;
  archivalService.archiveAppointments = archiveAppointmentsMock;

  // Fresh Date per call: the scheduler mutates the returned Date via
  // setDate/setFullYear to compute retention windows, so a shared instance
  // would corrupt subsequent reads.
  const clock = { now: () => new Date('2026-06-12T00:00:00.000Z') };
  const scheduler = new DataRetentionScheduler(
    prisma,
    auditService,
    archivalService,
    clock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    runUnrestrictedMock.mockImplementation(async (cb: () => Promise<unknown>) =>
      cb(),
    );
    patientFindManyMock.mockResolvedValue([]);
    userFindManyMock.mockResolvedValue([]);
    patientUpdateMock.mockResolvedValue({});
    userUpdateMock.mockResolvedValue({});
    auditLogActionMock.mockResolvedValue(undefined);
    archiveAuditLogsMock.mockResolvedValue(0);
    archiveWhatsappLogsMock.mockResolvedValue(0);
    archiveAppointmentsMock.mockResolvedValue(0);
  });

  it('is wired to the daily 23:00 data retention cron expression', () => {
    expect(CRON_SCHEDULES.DATA_RETENTION).toBe('0 23 * * *');
  });

  it('archives audit, whatsapp, and appointment records at their retention windows', async () => {
    await scheduler.handleDataRetention();

    expect(archiveAuditLogsMock).toHaveBeenCalledWith(90);
    expect(archiveWhatsappLogsMock).toHaveBeenCalledWith(180);
    expect(archiveAppointmentsMock).toHaveBeenCalledWith(2);
  });

  it('stops the pipeline and logs when an archival step throws', async () => {
    archiveAuditLogsMock.mockRejectedValueOnce(new Error('archival boom'));

    await expect(scheduler.handleDataRetention()).resolves.toBeUndefined();

    expect(archiveWhatsappLogsMock).not.toHaveBeenCalled();
    expect(patientFindManyMock).not.toHaveBeenCalled();
  });

  it('anonymizes soft-deleted patients and audits with the earliest clinic admin', async () => {
    patientFindManyMock.mockResolvedValue([
      { id: 'pat_1', clinicId: 'clinic_1' },
    ]);
    userFindManyMock
      .mockResolvedValueOnce([
        {
          id: 'admin_1',
          clinicId: 'clinic_1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'admin_2',
          clinicId: 'clinic_1',
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValue([]);

    await scheduler.handleDataRetention();

    expect(patientFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: { lt: THIRTY_DAYS_AGO },
          NOT: { email: { endsWith: '@anonymized.local' } },
        },
        select: { id: true, clinicId: true },
        take: 100,
      }),
    );
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { clinicId: { in: ['clinic_1'] } },
      select: { id: true, clinicId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(patientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'pat_1' },
      data: {
        firstName: 'Anonymous',
        lastName: 'Patient',
        email: 'anon-pat_1@anonymized.local',
        phoneNumber: '0000000000',
        address: null,
        dateOfBirth: new Date('1900-01-01'),
        emergencyContactName: null,
        emergencyContactPhone: null,
        whatsappConsent: false,
      },
    });
    expect(auditLogActionMock).toHaveBeenCalledWith({
      userId: 'admin_1',
      clinicId: 'clinic_1',
      actionType: 'DATA_RETENTION_ANONYMIZATION',
      resourceType: 'Patient',
      resourceId: 'pat_1',
      metadata: {
        reason: 'Retention Policy (3 Years/Soft Delete Expiry)',
      },
    });
  });

  it('skips the audit log when the clinic has no admin user', async () => {
    patientFindManyMock.mockResolvedValue([
      { id: 'pat_2', clinicId: 'clinic_1' },
    ]);
    userFindManyMock.mockResolvedValue([]);

    await scheduler.handleDataRetention();

    expect(patientUpdateMock).toHaveBeenCalledTimes(1);
    expect(auditLogActionMock).not.toHaveBeenCalled();
  });

  it('anonymizes soft-deleted staff accounts and audits the change', async () => {
    userFindManyMock.mockResolvedValue([
      { id: 'user_1', clinicId: 'clinic_1' },
    ]);

    await scheduler.handleDataRetention();

    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        name: 'Deleted User',
        email: 'deleted-user_1@anonymized.local',
        phoneNumber: null,
        mfaSecret: null,
        appLoginDisabled: true,
      },
    });
    expect(auditLogActionMock).toHaveBeenCalledWith({
      userId: 'user_1',
      clinicId: 'clinic_1',
      actionType: 'DATA_RETENTION_ANONYMIZATION',
      resourceType: 'User',
      resourceId: 'user_1',
      metadata: {
        reason:
          'Retention Policy (Staff Account Deletion / Soft Delete Expiry)',
      },
    });
  });

  it('anonymizes users without a clinic without writing an audit entry', async () => {
    userFindManyMock.mockResolvedValue([{ id: 'user_2', clinicId: null }]);

    await scheduler.handleDataRetention();

    expect(userUpdateMock).toHaveBeenCalledTimes(1);
    expect(auditLogActionMock).not.toHaveBeenCalled();
  });

  it('dedupes the admin lookup across distinct clinics and picks the earliest admin per clinic', async () => {
    patientFindManyMock.mockResolvedValue([
      { id: 'pat_1', clinicId: 'clinic_1' },
      { id: 'pat_2', clinicId: 'clinic_1' },
      { id: 'pat_3', clinicId: 'clinic_2' },
    ]);
    userFindManyMock
      .mockResolvedValueOnce([
        {
          id: 'admin_1',
          clinicId: 'clinic_1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          id: 'admin_2',
          clinicId: 'clinic_1',
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
        {
          id: 'admin_3',
          clinicId: 'clinic_2',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValue([]);

    await scheduler.handleDataRetention();

    // one batched lookup spanning both distinct clinics (deduped via Set)
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { clinicId: { in: ['clinic_1', 'clinic_2'] } },
      select: { id: true, clinicId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    // batched lookup + the (empty) staff sweep
    expect(userFindManyMock).toHaveBeenCalledTimes(2);
    expect(patientUpdateMock).toHaveBeenCalledTimes(3);
    // earliest admin per clinic: admin_1 for clinic_1, admin_3 for clinic_2
    expect(auditLogActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin_1', resourceId: 'pat_1' }),
    );
    expect(auditLogActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin_1', resourceId: 'pat_2' }),
    );
    expect(auditLogActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin_3', resourceId: 'pat_3' }),
    );
    expect(auditLogActionMock).toHaveBeenCalledTimes(3);
  });

  it('isolates a failed anonymization so the sweep still resolves', async () => {
    patientFindManyMock.mockResolvedValue([
      { id: 'pat_1', clinicId: 'clinic_1' },
    ]);
    userFindManyMock
      .mockResolvedValueOnce([
        {
          id: 'admin_1',
          clinicId: 'clinic_1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
      .mockResolvedValue([]);
    patientUpdateMock.mockRejectedValueOnce(new Error('update boom'));

    await expect(scheduler.handleDataRetention()).resolves.toBeUndefined();

    // the failed update throws before the audit write, and the staff sweep is empty
    expect(patientUpdateMock).toHaveBeenCalledTimes(1);
    expect(auditLogActionMock).not.toHaveBeenCalled();
  });
});
