import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../../prisma/prisma.service';
import { AuditService } from '../../../../../shared/modules/audit/audit/audit.service';
import type { PrismaTransaction } from '@workspace/types';
import {
  SLAAgreementDto,
  ConsentManagementDto,
} from '../../dto/onboarding/create-clinic-onboarding.dto';
import { getClinicSettings } from './type-helpers';

@Injectable()
export class OnboardingComplianceService {
  private readonly logger = new Logger(OnboardingComplianceService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async recordSLAAgreement(
    tx: PrismaTransaction,
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
          timestamp: new Date().toISOString(),
        },
      },
    });

    const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
    await tx.clinic.update({
      where: { id: clinicId },
      data: {
        settings: {
          ...getClinicSettings(clinic?.settings),
          sla: {
            accepted: true,
            version: slaData.slaVersion,
            acceptedAt: new Date().toISOString(),
            acceptedBy: slaData.acceptedBy,
            acceptedByUserId: userId,
          },
          dataProcessing: {
            termsAccepted: true,
            privacyPolicyAccepted: true,
            acceptedAt: new Date().toISOString(),
          },
        },
      },
    });

    this.logger.log(`Recorded SLA agreement for clinic: ${clinicId}`);
  }

  async configureConsentManagement(
    tx: PrismaTransaction,
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
            configuredAt: new Date().toISOString(),
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
      await this.auditService.logAction(
        {
          userId,
          clinicId,
          actionType: eventType,
          resourceType: 'Clinic',
          resourceId: clinicId,
          metadata,
        },
        true,
      );
    } catch (error) {
      this.logger.error(
        `Failed to log audit action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
