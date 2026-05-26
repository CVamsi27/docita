import { Inject, Injectable, Logger } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { ArchivalService } from './archival.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

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
  async handleDataRetention() {
    this.logger.log('Starting data retention check...');

    try {
      await this.archivalService.archiveAuditLogs(90);
      await this.archivalService.archiveWhatsappLogs(180);
      await this.archivalService.archiveAppointments(2);
      await this.processSoftDeletedRecords();
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

    const results = await Promise.allSettled(
      recordsToDelete.map((patient) =>
        this.anonymizePatient(patient.id, patient.clinicId),
      ),
    );
    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;
    if (successCount > 0) {
      this.logger.log(
        `Permanently anonymized ${successCount} soft-deleted patient(s)`,
      );
    }
    if (failureCount > 0) {
      this.logger.warn(
        `Failed to anonymize ${failureCount} soft-deleted patient(s)`,
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.error(
            `Failed to anonymize patient: ${this.formatError(
              result.reason instanceof Error
                ? result.reason
                : String(result.reason),
            )}`,
          );
        }
      }
    }
  }

  private async anonymizePatient(
    patientId: string,
    clinicId: string,
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

      const adminUser = await this.prisma.user.findFirst({
        where: { clinicId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (adminUser) {
        await this.auditService.logAction({
          userId: adminUser.id,
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
