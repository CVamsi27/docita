import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { EncryptionService } from '@/common/encryption.service';
import { ArchivalService } from './archival.service';

@Injectable()
export class DataRetentionScheduler {
  private readonly logger = new Logger(DataRetentionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private encryptionService: EncryptionService,
    private archivalService: ArchivalService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetention() {
    this.logger.log('Starting data retention check...');

    await this.archivalService.archiveAuditLogs(90);

    await this.archivalService.archiveWhatsappLogs(180);

    await this.archivalService.archiveAppointments(2);

    await this.processSoftDeletedRecords();

    await this.flagExpiredRecords();
  }

  private async processSoftDeletedRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recordsToDelete = await this.prisma.runUnrestricted(() =>
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

    for (const patient of recordsToDelete) {
      try {
        await this.anonymizePatient(patient.id, patient.clinicId);
        this.logger.log('Permanently anonymized soft-deleted patient');
      } catch (error) {
        this.logger.error('Failed to anonymize patient', error);
      }
    }
  }

  private async flagExpiredRecords() {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    await Promise.resolve();
  }

  private async anonymizePatient(
    patientId: string,
    clinicId: string,
  ): Promise<void> {
    const randomId = `ANON-${Date.now()}`;

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
        await this.auditService.logAction(
          {
            userId: adminUser.id,
            clinicId,
            actionType: 'DATA_RETENTION_ANONYMIZATION',
            resourceType: 'Patient',
            resourceId: patientId,
            metadata: {
              reason: 'Retention Policy (3 Years/Soft Delete Expiry)',
            },
          },
          true,
        );
      } else {
        this.logger.warn(
          'Skipping retention audit log: no users found in clinic',
        );
      }
    });
  }
}
