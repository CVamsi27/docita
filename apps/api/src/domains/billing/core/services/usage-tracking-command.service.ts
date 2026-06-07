// jscpd:ignore-start
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { PrismaService } from '@/prisma/prisma.service';
import { UsageType, Prisma } from '@workspace/db';
import type { AiCreditFeature } from '@workspace/types';

@Injectable()
export class UsageTrackingCommandService {
  private readonly logger = new Logger(UsageTrackingCommandService.name);

  constructor(private prisma: PrismaService) {}

  async recordUsageEvent(params: {
    clinicId: string;
    type: UsageType;
    quantity?: number;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const {
// jscpd:ignore-end
      clinicId,
      type,
      quantity = 1,
      entityType,
      entityId,
      metadata,
    } = params;

    const eventKey = entityId
      ? `${clinicId}:${type}:${entityType}:${entityId}`
      : undefined;

    try {
      await this.prisma.usageEvent.create({
        data: {
          clinicId,
          type,
          quantity,
          entityType,
          entityId,
          eventKey,
          metadata: metadata || Prisma.JsonNull,
        },
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        this.logger.debug(`Duplicate usage event ignored: ${eventKey}`);
        return;
      }
      throw error;
    }
  }

  async trackWhatsAppMessage(
    clinicId: string,
    messageId: string,
    type: 'template' | 'session' | 'media' = 'template',
  ) {
    const weights = { template: 1, session: 0.5, media: 1.5 };
    const quantity = Math.ceil(weights[type]);

    await this.recordUsageEvent({
      clinicId,
      type: UsageType.WHATSAPP_MESSAGES,
      quantity,
      entityType: 'WhatsappLog',
      entityId: messageId,
      metadata: { messageType: type },
    });
  }

  async trackAICredits(
    clinicId: string,
    feature: keyof typeof import('@workspace/types').AI_CREDIT_COSTS,
    entityId?: string,
  ) {
    const { AI_CREDIT_COSTS } = await import('@workspace/types');
    const credits = AI_CREDIT_COSTS[feature] || 1;

    await this.recordUsageEvent({
      clinicId,
      type: 'AI_CREDITS',
      quantity: credits,
      entityType: 'AIUsage',
      entityId,
      metadata: { feature },
    });
  }

  async trackPatientActivity(clinicId: string, patientId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'ACTIVE_PATIENTS',
      quantity: 1,
      entityType: 'Patient',
      entityId: patientId,
    });
  }

  async trackAppointment(clinicId: string, appointmentId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'APPOINTMENTS',
      quantity: 1,
      entityType: 'Appointment',
      entityId: appointmentId,
    });
  }

  async trackPrescription(clinicId: string, prescriptionId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: UsageType.PRESCRIPTIONS,
      quantity: 1,
      entityType: 'Prescription',
      entityId: prescriptionId,
    });
  }

  async trackInvoice(clinicId: string, invoiceId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: UsageType.INVOICES,
      quantity: 1,
      entityType: 'Invoice',
      entityId: invoiceId,
    });
  }

  async trackConsultation(clinicId: string, appointmentId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: UsageType.CONSULTATIONS,
      quantity: 1,
      entityType: 'Appointment',
      entityId: appointmentId,
    });
  }

  async trackOcrPage(clinicId: string, pageCount: number, documentId?: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'OCR_PAGE',
      quantity: pageCount,
      entityType: 'Document',
      entityId: documentId,
    });
  }

  async trackApiCall(clinicId: string) {
    await this.recordUsageEvent({
      clinicId,
      type: 'API_CALL',
      quantity: 1,
      entityType: 'ApiRequest',
    });
  }

  @OnEvent(ApplicationEvents.OCR_PAGE_PROCESSED)
  async handleOcrPageProcessed(payload: {
    clinicId: string;
    pageCount: number;
  }) {
    await this.trackOcrPage(payload.clinicId, payload.pageCount).catch(
      (err) => {
        this.logger.error('Failed to track OCR page usage', err);
      },
    );
  }

  @OnEvent(ApplicationEvents.WHATSAPP_MESSAGE_SENT)
  async handleWhatsAppMessageSent(payload: {
    clinicId: string;
    messageId: string;
    messageType?: 'template' | 'session' | 'media';
  }) {
    await this.trackWhatsAppMessage(
      payload.clinicId,
      payload.messageId,
      payload.messageType ?? 'template',
    ).catch((err) => {
      this.logger.error('Failed to track WhatsApp message usage', err);
    });
  }

  @OnEvent(ApplicationEvents.PRESCRIPTION_CREATED)
  async handlePrescriptionCreated(payload: {
    clinicId: string;
    prescriptionId: string;
  }) {
    await this.trackPrescription(
      payload.clinicId,
      payload.prescriptionId,
    ).catch((err) => {
      this.logger.error('Failed to track prescription usage', err);
    });
  }

  @OnEvent(ApplicationEvents.INVOICE_GENERATED)
  async handleInvoiceGenerated(payload: {
    clinicId: string;
    invoiceId: string;
  }) {
    await this.trackInvoice(payload.clinicId, payload.invoiceId).catch(
      (err) => {
        this.logger.error('Failed to track invoice usage', err);
      },
    );
  }

  @OnEvent(ApplicationEvents.APPOINTMENT_COMPLETED)
  async handleAppointmentCompleted(payload: {
    clinicId: string;
    appointmentId: string;
  }) {
    await this.trackConsultation(payload.clinicId, payload.appointmentId).catch(
      (err) => {
        this.logger.error('Failed to track consultation usage', err);
      },
    );
  }

  @OnEvent(ApplicationEvents.AI_CREDITS_CONSUMED)
  async handleAiCreditsConsumed(payload: {
    clinicId: string;
    feature: AiCreditFeature;
    entityId?: string;
  }) {
    await this.trackAICredits(
      payload.clinicId,
      payload.feature,
      payload.entityId,
    ).catch((err) => {
      this.logger.error('Failed to track AI credit usage', err);
    });
  }
}
