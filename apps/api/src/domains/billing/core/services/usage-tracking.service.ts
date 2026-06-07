// jscpd:ignore-start
import { Injectable } from '@nestjs/common';
import { UsageType, Prisma } from '@workspace/db';
import { UsageTrackingQueryService } from './usage-tracking-query.service';
import { UsageTrackingCommandService } from './usage-tracking-command.service';

/**
 * Thin facade — preserves the original public API.
 * Query logic lives in UsageTrackingQueryService.
 * Write/event logic lives in UsageTrackingCommandService.
 */
@Injectable()
export class UsageTrackingService {
  constructor(
    private readonly query: UsageTrackingQueryService,
    private readonly command: UsageTrackingCommandService,
  ) {}

  // ── Query delegates ──────────────────────────────────────────────────────

  async getCurrentUsage(clinicId: string) {
    return this.query.getCurrentUsage(clinicId);
  }

  async calculateOverageCharges(clinicId: string) {
    return this.query.calculateOverageCharges(clinicId);
  }

  // ── Command delegates ────────────────────────────────────────────────────

  async recordUsageEvent(params: {
    clinicId: string;
    type: UsageType;
    quantity?: number;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.command.recordUsageEvent(params);
// jscpd:ignore-end
  }

  async trackWhatsAppMessage(
    clinicId: string,
    messageId: string,
    type: 'template' | 'session' | 'media' = 'template',
  ) {
    return this.command.trackWhatsAppMessage(clinicId, messageId, type);
  }

  async trackAICredits(
    clinicId: string,
    feature: keyof typeof import('@workspace/types').AI_CREDIT_COSTS,
    entityId?: string,
  ) {
    return this.command.trackAICredits(clinicId, feature, entityId);
  }

  async trackPatientActivity(clinicId: string, patientId: string) {
    return this.command.trackPatientActivity(clinicId, patientId);
  }

  async trackAppointment(clinicId: string, appointmentId: string) {
    return this.command.trackAppointment(clinicId, appointmentId);
  }

  async trackPrescription(clinicId: string, prescriptionId: string) {
    return this.command.trackPrescription(clinicId, prescriptionId);
  }

  async trackInvoice(clinicId: string, invoiceId: string) {
    return this.command.trackInvoice(clinicId, invoiceId);
  }

  async trackConsultation(clinicId: string, appointmentId: string) {
    return this.command.trackConsultation(clinicId, appointmentId);
  }

  async trackOcrPage(clinicId: string, pageCount: number, documentId?: string) {
    return this.command.trackOcrPage(clinicId, pageCount, documentId);
  }

  async trackApiCall(clinicId: string) {
    return this.command.trackApiCall(clinicId);
  }
}
