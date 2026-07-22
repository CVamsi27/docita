import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { ArchivalService } from './archival.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { TrackHeartbeat } from '@/shared/modules/schedule/cron-heartbeat';

@Injectable()
export class DataRetentionScheduler {
  private readonly logger = new Logger(DataRetentionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private archivalService: ArchivalService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private formatError(error: Error | string): string {
    return typeof error === 'string'
      ? error
      : `${error.name}: ${error.message}`;
  }

  @Cron(CRON_SCHEDULES.DATA_RETENTION, {
    disabled: isCronDisabledInThisProcess(),
  })
  @TrackHeartbeat('compliance.data-retention')
  async handleDataRetention() {
    this.logger.log('Starting data retention check...');

    try {
      await this.archivalService.archiveAuditLogs(90);
      await this.archivalService.archiveWhatsappLogs(180);
      await this.archivalService.archiveAppointments(2);
      await this.processSoftDeletedRecords();
      await this.processSoftDeletedUsers();
    } catch (error) {
      this.logger.error(
        `Data retention check failed: ${this.formatError(
          error instanceof Error ? error : String(error),
        )}`,
      );
    }
  }

  private async processSoftDeletedRecords() {
    const thirtyDaysAgo = this.clock.now();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // RLS-BYPASS: compliance retention and archival jobs span tenants by design
    const recordsToDelete = await this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findMany({
        where: {
          deletedAt: {
            lt: thirtyDaysAgo,
          },
          NOT: {
            email: { endsWith: '@anonymized.local' },
          },
        },
        select: { id: true, clinicId: true },
        take: 100,
      }),
    );

    if (recordsToDelete.length === 0) return;

    // Cache the admin user for each affected clinic so the per-patient
    // anonymization does not issue an extra `user.findFirst` query for
    // every row. 100 patients across 100 clinics would otherwise fan out
    // to 100 + 100 = 200 SELECTs; this brings it down to 100 + N where N
    // is the number of distinct clinics in the batch (usually 1).
    const clinicIds = Array.from(
      new Set(
        recordsToDelete
          .map((patient) => patient.clinicId)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const adminByClinic = await this.fetchAdminUsersByClinic(clinicIds);

    const results = await Promise.allSettled(
      recordsToDelete.map((patient) => {
        const admin = patient.clinicId
          ? adminByClinic.get(patient.clinicId)
          : undefined;
        return this.anonymizePatient(patient.id, patient.clinicId, admin?.id);
      }),
    );
    this.logSweepOutcome(results, 'patient');
  }

  /**
   * Single batched lookup of the earliest-created admin user per clinic.
   * Replaces what would otherwise be one `user.findFirst` per anonymized
   * patient in the compliance sweep.
   */
  private async fetchAdminUsersByClinic(
    clinicIds: string[],
  ): Promise<Map<string, { id: string }>> {
    if (clinicIds.length === 0) return new Map();
    // RLS-BYPASS: compliance retention spans tenants; users precede tenant bind.
    const rows = await this.prisma.runUnrestricted(async () =>
      this.prisma.user.findMany({
        where: { clinicId: { in: clinicIds } },
        select: { id: true, clinicId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
    const earliest = new Map<string, { id: string }>();
    for (const row of rows) {
      if (!row.clinicId) continue;
      if (!earliest.has(row.clinicId)) earliest.set(row.clinicId, row);
    }
    return earliest;
  }

  /** Shared success/failure logging for a retention anonymization sweep. */
  private logSweepOutcome(
    results: PromiseSettledResult<void>[],
    label: 'patient' | 'user',
  ): void {
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;
    if (successCount > 0) {
      this.logger.log(
        `Permanently anonymized ${successCount} soft-deleted ${label}(s)`,
      );
    }
    if (failureCount > 0) {
      this.logger.warn(
        `Failed to anonymize ${failureCount} soft-deleted ${label}(s)`,
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Failed to anonymize ${label}: ${this.formatError(
              result.reason instanceof Error
                ? result.reason
                : String(result.reason),
            )}`,
          );
        }
      }
    }
  }

  private async processSoftDeletedUsers() {
    const thirtyDaysAgo = this.clock.now();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // RLS-BYPASS: compliance retention spans tenants; users precede tenant bind.
    const usersToAnonymize = await this.prisma.runUnrestricted(async () =>
      this.prisma.user.findMany({
        where: {
          deletedAt: { lt: thirtyDaysAgo },
          NOT: { email: { endsWith: '@anonymized.local' } },
        },
        select: { id: true, clinicId: true },
        take: 100,
      }),
    );

    const results = await Promise.allSettled(
      usersToAnonymize.map((user) =>
        this.anonymizeUser(user.id, user.clinicId),
      ),
    );
    this.logSweepOutcome(results, 'user');
  }

  private async anonymizeUser(
    userId: string,
    clinicId: string | null,
  ): Promise<void> {
    // RLS-BYPASS: compliance retention spans tenants; users precede tenant bind.
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          // cuid userId keeps this deterministic and collision-free (email unique).
          email: `deleted-${userId}@anonymized.local`,
          phoneNumber: null,
          mfaSecret: null,
          appLoginDisabled: true,
        },
      });

      if (clinicId) {
        await this.auditService.logAction({
          userId,
          clinicId,
          actionType: 'DATA_RETENTION_ANONYMIZATION',
          resourceType: 'User',
          resourceId: userId,
          metadata: {
            reason:
              'Retention Policy (Staff Account Deletion / Soft Delete Expiry)',
          },
        });
      }
    });
  }

  private async anonymizePatient(
    patientId: string,
    clinicId: string,
    adminUserId?: string,
  ): Promise<void> {
    const randomId = `ANON-${this.clock.now().getTime()}`;

    // RLS-BYPASS: compliance retention and archival jobs span tenants by design
    await this.prisma.runUnrestricted(async () => {
      await this.prisma.patient.update({
        where: { id: patientId },
        data: {
          firstName: 'Anonymous',
          lastName: 'Patient',
          email: `${randomId}@anonymized.local`,
          phoneNumber: '0000000000',
          address: null,
          dateOfBirth: new Date('1900-01-01'),
          emergencyContactName: null,
          emergencyContactPhone: null,
          whatsappConsent: false,
        },
      });

      // Admin user is resolved once per batch by the caller
      // (processSoftDeletedRecords → fetchAdminUsersByClinic) so the
      // per-patient audit log does not issue another round-trip to the
      // database for every row.
      if (adminUserId) {
        await this.auditService.logAction({
          userId: adminUserId,
          clinicId,
          actionType: 'DATA_RETENTION_ANONYMIZATION',
          resourceType: 'Patient',
          resourceId: patientId,
          metadata: {
            reason: 'Retention Policy (3 Years/Soft Delete Expiry)',
          },
        });
      } else {
        this.logger.warn(
          'Skipping retention audit log: no users found in clinic',
        );
      }
    });
  }
}
