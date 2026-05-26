import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import type { Prisma } from '@workspace/db';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  SLAAgreementDto,
  ConsentManagementDto,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { getClinicSettings } from './type-helpers';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class OnboardingComplianceService {
  private readonly logger = new Logger(OnboardingComplianceService.name);

  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private auditService: AuditService,
    private storageProvider: StorageProvider,
    private configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  private buildSlaProofPdfBuffer(params: {
    clinicName: string;
    clinicId: string;
    acceptedBy: string;
    userId: string;
    acceptedAtIso: string;
    slaVersion: string;
    signatureUrl: string;
    signatureAuthHash: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('Docita Service Level Agreement (SLA)', {
        align: 'center',
      });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Version: ${params.slaVersion}`, { align: 'center' });
      doc.moveDown(1);

      doc
        .fontSize(12)
        .text('Scope')
        .fontSize(10)
        .text(
          'This SLA governs platform uptime, support obligations, incident response, data security, privacy, backup/recovery, billing, and compliance responsibilities for the Docita clinic platform.',
        );

      doc.moveDown(0.75);
      doc
        .fontSize(12)
        .text('Service Commitments')
        .fontSize(10)
        .list([
          `Platform uptime target: ${this.configService.getSlaAgreementConfig().uptimeTarget ?? this.formatUptime(process.uptime())}.`,
          'Critical incident response target: within 4 hours.',
          'High incident response target: within 8 business hours.',
          'Business continuity with secure backups and recovery procedures.',
          'DPDP-aligned handling of protected health and personal data.',
          'Audit logging for sensitive operations and legal acceptance events.',
        ]);

      doc.moveDown(0.75);
      doc
        .fontSize(12)
        .text('Compliance and Data Protection')
        .fontSize(10)
        .list([
          'Data processing is limited to consented healthcare operations.',
          'Access is role-based and tenant-scoped.',
          'All legal acceptance actions are kept immutable for evidence.',
          'This signed proof is stored for non-repudiation.',
        ]);

      doc.moveDown(0.75);
      doc.fontSize(12).text('Acceptance Record').fontSize(10);
      doc.text(`Clinic: ${params.clinicName} (${params.clinicId})`);
      doc.text(`Accepted By: ${params.acceptedBy}`);
      doc.text(`Accepted By User ID: ${params.userId}`);
      doc.text(`Accepted At: ${params.acceptedAtIso}`);
      doc.text(`IP Address: ${params.ipAddress || 'Not captured'}`);
      doc.text(`User Agent: ${params.userAgent || 'Not captured'}`);
      doc.text(`Signature URL: ${params.signatureUrl}`);
      doc.text(`Signature Authentication Hash: ${params.signatureAuthHash}`);

      doc.moveDown(0.75);
      doc
        .fontSize(10)
        .text(
          'By signing and accepting this SLA, the clinic confirms understanding of service scope, obligations, data processing terms, and operational governance under this agreement.',
        );

      doc.end();
    });
  }

  async recordSLAAgreement(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
    slaData: SLAAgreementDto,
    ipAddress?: string,
  ): Promise<void> {
    if (!slaData.acceptedSLA) {
      throw new BadRequestException('SLA must be accepted to proceed');
    }

    if (!slaData.acceptedDataProcessingTerms) {
      throw new BadRequestException('Data processing terms must be accepted');
    }

    if (!slaData.acceptedPrivacyPolicy) {
      throw new BadRequestException('Privacy policy must be accepted');
    }

    const signatureSession = await tx.uploadSession.findUnique({
      where: { id: slaData.signatureSessionId },
    });

    if (
      !signatureSession ||
      signatureSession.status !== 'uploaded' ||
      !signatureSession.fileUrl
    ) {
      throw new BadRequestException('Valid SLA signature upload is required');
    }

    const acceptedAtIso = this.clock.now().toISOString();
    const signatureAuthHash = createHash('sha256')
      .update(
        `${clinicId}:${userId}:${slaData.signatureSessionId}:${signatureSession.fileUrl}:${acceptedAtIso}`,
      )
      .digest('hex');

    const clinicSnapshot = await tx.clinic.findUnique({
      where: { id: clinicId },
    });

    const pdfBuffer = await this.buildSlaProofPdfBuffer({
      clinicName: clinicSnapshot?.name ?? '',
      clinicId,
      acceptedBy: slaData.acceptedBy,
      userId,
      acceptedAtIso,
      slaVersion: slaData.slaVersion,
      signatureUrl: signatureSession.fileUrl,
      signatureAuthHash,
      ipAddress: ipAddress || slaData.ipAddress,
      userAgent: slaData.userAgent,
    });

    const proofPdfUrl = await this.storageProvider.upload(
      {
        fieldname: 'file',
        originalname: `sla-proof-${clinicId}.pdf`,
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: pdfBuffer.length,
        buffer: pdfBuffer,
      },
      'legal',
      {
        metadata: {
          asset_type: 'sla-proof-pdf',
          clinic_id: clinicId,
          signature_session_id: slaData.signatureSessionId,
          signature_url: signatureSession.fileUrl,
          signature_auth_hash: signatureAuthHash,
          modified_at: acceptedAtIso,
          modified_by: userId,
          accepted_by: slaData.acceptedBy,
          auth_method: 'onboarding-sla-acceptance',
          auth_ip: ipAddress || slaData.ipAddress,
          auth_user_agent: slaData.userAgent,
        },
      },
    );

    await tx.auditLog.create({
      data: {
        userId,
        clinicId,
        action: 'SLA_ACCEPTED',
        entityType: 'Legal',
        entityId: clinicId,
        metadata: {
          slaVersion: slaData.slaVersion,
          acceptedBy: slaData.acceptedBy,
          acceptedDataProcessingTerms: slaData.acceptedDataProcessingTerms,
          acceptedPrivacyPolicy: slaData.acceptedPrivacyPolicy,
          ipAddress: ipAddress || slaData.ipAddress,
          userAgent: slaData.userAgent,
          signatureSessionId: slaData.signatureSessionId,
          signatureUrl: signatureSession.fileUrl,
          signatureAuthHash,
          proofPdfUrl,
          timestamp: acceptedAtIso,
        },
      },
    });

    const clinic = clinicSnapshot;
    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        settings: {
          ...getClinicSettings(clinic?.settings),
          sla: {
            accepted: true,
            version: slaData.slaVersion,
            acceptedAt: acceptedAtIso,
            acceptedBy: slaData.acceptedBy,
            acceptedByUserId: userId,
            signatureSessionId: slaData.signatureSessionId,
            signatureUrl: signatureSession.fileUrl,
            signatureAuthHash,
            proofPdfUrl,
          },
          dataProcessing: {
            termsAccepted: true,
            privacyPolicyAccepted: true,
            acceptedAt: acceptedAtIso,
          },
        },
      },
    });

    this.logger.log(`Recorded SLA agreement for clinic: ${clinicId}`);
  }

  async configureConsentManagement(
    tx: Prisma.TransactionClient,
    clinicId: string,
    consentData: ConsentManagementDto,
  ): Promise<void> {
    const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });

    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        whatsappAutomation: {
          enabled: consentData.enableWhatsAppCommunication,
          whatsappBusinessNumber: consentData.whatsappBusinessNumber,
          requireConsentBeforeSending:
            consentData.patientConsentRequiredBeforeWhatsApp,
          logAllMessages: true,
        },
        settings: {
          ...getClinicSettings(clinic?.settings),
          consentManagement: {
            whatsappEnabled: consentData.enableWhatsAppCommunication,
            marketingEnabled: consentData.enableMarketingCommunications,
            dataProcessingPurposes: consentData.dataProcessingPurposes,
            requireExplicitConsent:
              consentData.patientConsentRequiredBeforeWhatsApp,
            logAllConsentChanges: consentData.logAllConsentChanges,
            configuredAt: this.clock.now().toISOString(),
          },
        },
      },
    });

    this.logger.log(`Configured consent management for clinic: ${clinicId}`);
  }

  async logOnboardingEvent(
    userId: string,
    clinicId: string,
    eventType: 'CLINIC_ONBOARDED' | 'CLINIC_ONBOARDING_FAILED',
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditService.logAction({
        userId,
        clinicId,
        actionType: eventType,
        resourceType: 'Clinic',
        resourceId: clinicId,
        metadata,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log audit action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
