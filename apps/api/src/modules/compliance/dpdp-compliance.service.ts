/**
 * DPDP Compliance Service
 * Handles consent management, data subject rights, and compliance tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConsentType, ConsentStatus } from '@workspace/db';

export enum DataSubjectRight {
  ACCESS = 'ACCESS', // Right to access data
  CORRECTION = 'CORRECTION', // Right to correct data
  ERASURE = 'ERASURE', // Right to delete data
  PORTABILITY = 'PORTABILITY', // Right to export data
  OBJECTION = 'OBJECTION', // Right to object to processing
  RESTRICTION = 'RESTRICTION', // Right to restrict processing
}

interface ConsentRecord {
  patientId: string;
  clinicId: string;
  consentType: ConsentType;
  status: ConsentStatus;
  purpose: string;
  givenBy?: string;
  givenAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

interface DataSubjectRequest {
  patientId: string;
  clinicId: string;
  requestType: DataSubjectRight;
  reason?: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class DPDPComplianceService {
  private readonly logger = new Logger(DPDPComplianceService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Record patient consent
   * DPDP Requirement: Explicit consent with audit trail
   */
  async recordConsent(data: ConsentRecord, ipAddress?: string): Promise<any> {
    const consent = await this.prisma.consent.create({
      data: {
        patientId: data.patientId,
        clinicId: data.clinicId,
        consentType: data.consentType,
        status: data.status,
        givenBy: data.givenBy,
        givenAt: data.givenAt || new Date(),
        validFrom: new Date(),
        validUntil: data.expiresAt,
      },
    });

    // Audit log
    await this.auditService.logAction({
      userId: data.patientId,
      clinicId: data.clinicId,
      actionType: 'CONSENT_RECORDED',
      resourceType: 'Consent',
      resourceId: consent.id,
      metadata: {
        consentType: data.consentType,
        status: data.status,
        purpose: data.purpose,
      },
      ipAddress,
    });

    this.logger.log(
      `Consent recorded: ${consent.id} for patient: ${data.patientId}`,
    );

    return consent;
  }

  /**
   * Withdraw patient consent
   * DPDP Requirement: Right to withdraw consent at any time
   */
  async withdrawConsent(
    consentId: string,
    reason: string,
    withdrawnBy: string,
    ipAddress?: string,
  ): Promise<any> {
    const consent = await this.prisma.consent.update({
      where: { id: consentId },
      data: {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: withdrawnBy,
        revokedReason: reason,
      },
    });

    // Audit log
    await this.auditService.logAction({
      userId: withdrawnBy,
      clinicId: consent.clinicId,
      actionType: 'CONSENT_WITHDRAWN',
      resourceType: 'Consent',
      resourceId: consent.id,
      metadata: {
        consentType: consent.consentType,
        reason,
        withdrawnBy,
      },
      ipAddress,
    });

    this.logger.log(`Consent withdrawn: ${consentId} by: ${withdrawnBy}`);

    return consent;
  }

  /**
   * Check if patient has given consent for a specific purpose
   */
  async hasValidConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType,
  ): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        patientId,
        clinicId,
        consentType,
        status: ConsentStatus.ACTIVE,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    });

    return !!consent;
  }

  /**
   * Handle data subject access request (DSAR)
   * DPDP Requirement: Right to access personal data
   */
  async handleAccessRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<any> {
    // Retrieve all patient data
    const patientData = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      include: {
        appointments: true,
        prescriptions: true,
        documents: true,
        invoices: true,
        medicalConditions: true,
        patientAllergies: true,
        familyHistory: true,
        socialHistory: true,
        immunizations: true,
      },
    });

    // Audit log
    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_ACCESS_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        requestType: data.requestType,
        reason: data.reason,
      },
      ipAddress,
    });

    this.logger.log(`Access request processed for patient: ${data.patientId}`);

    return patientData;
  }

  /**
   * Handle data correction request
   * DPDP Requirement: Right to correct inaccurate data
   */
  async handleCorrectionRequest(
    data: DataSubjectRequest & { corrections: Record<string, unknown> },
    ipAddress?: string,
  ): Promise<any> {
    // Update patient data
    const updatedPatient = await this.prisma.patient.update({
      where: { id: data.patientId },
      data: data.corrections,
    });

    // Audit log
    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_CORRECTION_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        corrections: data.corrections,
        reason: data.reason,
      },
      ipAddress,
    });

    this.logger.log(
      `Correction request processed for patient: ${data.patientId}`,
    );

    return updatedPatient;
  }

  /**
   * Handle data erasure request (Right to be forgotten)
   * DPDP Requirement: Right to erasure
   */
  async handleErasureRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<any> {
    // Cannot delete if there are legal obligations (e.g., pending invoices)
    const pendingObligations = await this.checkPendingObligations(
      data.patientId,
    );

    if (pendingObligations.length > 0) {
      throw new Error(
        `Cannot delete patient due to pending obligations: ${pendingObligations.join(', ')}`,
      );
    }

    // Anonymize instead of delete (for medical records retention)
    const anonymizedPatient = await this.anonymizePatient(data.patientId);

    // Audit log
    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_ERASURE_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        reason: data.reason,
        anonymized: true,
      },
      ipAddress,
    });

    this.logger.log(`Erasure request processed for patient: ${data.patientId}`);

    return { anonymized: true, patient: anonymizedPatient };
  }

  /**
   * Handle data portability request
   * DPDP Requirement: Right to data portability
   */
  async handlePortabilityRequest(
    data: DataSubjectRequest,
    ipAddress?: string,
  ): Promise<any> {
    // Export patient data in machine-readable format (JSON)
    const exportData = await this.exportPatientData(data.patientId);

    // Audit log
    await this.auditService.logAction({
      userId: data.requestedBy,
      clinicId: data.clinicId,
      actionType: 'DATA_PORTABILITY_REQUEST',
      resourceType: 'Patient',
      resourceId: data.patientId,
      metadata: {
        format: 'JSON',
        recordCount: Object.keys(exportData).length,
      },
      ipAddress,
    });

    this.logger.log(
      `Portability request processed for patient: ${data.patientId}`,
    );

    return exportData;
  }

  /**
   * Anonymize patient data
   */
  private async anonymizePatient(patientId: string): Promise<any> {
    const randomId = `ANON-${Date.now()}`;

    return await this.prisma.patient.update({
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
  }

  /**
   * Check for pending legal obligations
   */
  private async checkPendingObligations(patientId: string): Promise<string[]> {
    const obligations: string[] = [];

    // Check for unpaid invoices
    const unpaidInvoices = await this.prisma.invoice.count({
      where: {
        patientId,
        status: { in: ['pending', 'overdue'] },
      },
    });

    if (unpaidInvoices > 0) {
      obligations.push(`${unpaidInvoices} unpaid invoices`);
    }

    // Check for active appointments
    const futureAppointments = await this.prisma.appointment.count({
      where: {
        patientId,
        startTime: { gte: new Date() },
        status: { not: 'cancelled' },
      },
    });

    if (futureAppointments > 0) {
      obligations.push(`${futureAppointments} future appointments`);
    }

    return obligations;
  }

  /**
   * Export patient data in portable format
   */
  private async exportPatientData(patientId: string): Promise<any> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        appointments: {
          include: {
            vitalSign: true,
            diagnoses: true,
            procedures: true,
          },
        },
        prescriptions: {
          include: {
            medications: true,
          },
        },
        documents: true,
        invoices: true,
        medicalConditions: true,
        patientAllergies: true,
        familyHistory: true,
        socialHistory: true,
        immunizations: true,
      },
    });

    return {
      exportDate: new Date().toISOString(),
      format: 'JSON',
      version: '1.0',
      patient: patient,
    };
  }

  /**
   * Get consent history for a patient
   */
  async getConsentHistory(patientId: string, clinicId: string): Promise<any[]> {
    return await this.prisma.consent.findMany({
      where: {
        patientId,
        clinicId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Validate WhatsApp communication consent before sending
   */
  async validateWhatsAppConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    // Check clinic settings
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { whatsappAutomation: true },
    });

    const automation = clinic?.whatsappAutomation as any;

    if (!automation?.requireConsentBeforeSending) {
      return true; // Consent not required by clinic
    }

    // Check patient consent
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { whatsappConsent: true, whatsappConsentAt: true },
    });

    return patient?.whatsappConsent || false;
  }
}
