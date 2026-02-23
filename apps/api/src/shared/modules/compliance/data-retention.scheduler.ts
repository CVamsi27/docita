import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EncryptionService } from '../../common/encryption.service';
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

  /**
   * Run retention policy check daily at midnight
   * DPDP/Clinical Establishments Rules: Retain records for 3 years
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataRetention() {
    this.logger.log('Starting data retention check...');

    // 1. Audit Log Archival (90 days)
    await this.archivalService.archiveAuditLogs(90);

    // 2. WhatsApp Log Archival (180 days)
    await this.archivalService.archiveWhatsappLogs(180);

    // 3. Appointment Archival (2 years)
    await this.archivalService.archiveAppointments(2);

    // 4. Identify soft-deleted records older than 30 days (Permanent Deletion)
    // We keep soft-deleted for 30 days grace period, then anonymize
    await this.processSoftDeletedRecords();

    // 5. Identify inactive patient records older than 3 years (Archival/Anonymization)
    // For now, we just log them as we need specific clinic policies for action
    await this.flagExpiredRecords();
  }

  private async processSoftDeletedRecords() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recordsToDelete = await this.prisma.patient.findMany({
      where: {
        deletedAt: {
          lt: thirtyDaysAgo,
        },
        // Ensure not already anonymized
        NOT: {
          email: { endsWith: '@anonymized.local' },
        },
      },
      take: 100, // Process in batches
    });

    for (const patient of recordsToDelete) {
      try {
        await this.anonymizePatient(patient.id);
        this.logger.log(
          `Permanently anonymized soft-deleted patient: ${patient.id}`,
        );
      } catch (error) {
        this.logger.error(`Failed to anonymize patient ${patient.id}`, error);
      }
    }
  }

  private async flagExpiredRecords() {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // Find patients with no activity (last appointment) for > 3 years
    // This is a complex query, simplified here for the scheduler
    // In production, this would likely move to a data warehouse or separate job
    await Promise.resolve();
  }

  private async anonymizePatient(patientId: string): Promise<void> {
    const randomId = `ANON-${Date.now()}`;

    // Replace PII with anonymized data
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
        // Keep medical history but unlink from identified person
        // In a real scenario, we might move this to an archive table
      },
    });

    await this.auditService.logAction({
      userId: 'SYSTEM_RETENTION_JOB',
      clinicId: 'SYSTEM',
      actionType: 'DATA_RETENTION_ANONYMIZATION',
      resourceType: 'Patient',
      resourceId: patientId,
      metadata: {
        reason: 'Retention Policy (3 Years/Soft Delete Expiry)',
      },
    });
  }
}
