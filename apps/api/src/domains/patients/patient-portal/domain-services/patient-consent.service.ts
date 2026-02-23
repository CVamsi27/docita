/**
 * Patient Consent & Privacy Service (SRP)
 *
 * Single Responsibility: Patient consent management, data deletion (GDPR/DPDP).
 * Extracted from PatientPortalService to isolate compliance-sensitive logic.
 *
 * Why separate?
 * - Compliance logic changes at a different rate than feature logic
 * - Audit requirements are stricter for consent operations
 * - Easier to add new consent types without touching other services
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PatientConsentService {
  private readonly logger = new Logger(PatientConsentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current consent settings for a patient
   */
  async getConsentSettings(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return {
      whatsappConsent: patient.whatsappConsent,
      whatsappConsentAt: patient.whatsappConsentAt,
      isFirstLogin: !patient.whatsappConsentAt,
    };
  }

  /**
   * Update patient consent settings
   * Logs changes for audit trail
   */
  async updateConsentSettings(
    patientId: string,
    whatsappConsent?: boolean,
    _dataStorageConsent?: boolean,
  ) {
    const updateData: Record<string, unknown> = {};

    if (whatsappConsent !== undefined) {
      updateData.whatsappConsent = whatsappConsent;
      updateData.whatsappConsentAt = whatsappConsent ? new Date() : null;

      this.logger.log(
        `Patient ${patientId} ${whatsappConsent ? 'granted' : 'revoked'} WhatsApp consent`,
      );
    }

    const updatedPatient = await this.prisma.patient.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
      },
    });

    return updatedPatient;
  }

  /**
   * Request data deletion (GDPR/DPDP compliance)
   *
   * Performs soft deletion and anonymization of PII.
   * Does NOT log PII in plaintext (safety rule).
   */
  async requestDataDeletion(patientId: string, reason: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, deletedAt: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.deletedAt) {
      throw new BadRequestException('Data deletion already requested');
    }

    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        deletedAt: new Date(),
        email: `deleted-${patientId}@anonymized.local`,
        phoneNumber: 'DELETED',
        address: 'DELETED',
      },
    });

    this.logger.log(
      `Data deletion requested for patient ${patientId} (reason length: ${reason.length})`,
    );

    return {
      success: true,
      message:
        'Data deletion request submitted. Your account will be deactivated within 30 days.',
    };
  }
}
