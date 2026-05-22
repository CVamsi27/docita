import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import {
  WHATSAPP_PERSISTENCE_PORT,
  type WhatsappPersistencePort,
} from '@/domains/whatsapp/application/ports/whatsapp-persistence.port';
import { StaffNotificationService } from '@/domains/whatsapp/application/services/staff-notification.service';

/**
 * Bridges already-fired domain events into the staff in-app notification
 * system. Domain services that don't yet emit events (prescriptions, payment
 * webhooks, consultation lifecycle, appointment status changes) need to start
 * emitting before listeners can be added here.
 */
@Injectable()
export class StaffNotificationListener {
  private readonly logger = new Logger(StaffNotificationListener.name);

  constructor(
    private readonly staffNotifications: StaffNotificationService,
    @Inject(WHATSAPP_PERSISTENCE_PORT)
    private readonly persistence: WhatsappPersistencePort,
  ) {}

  @OnEvent(ApplicationEvents.INVOICE_GENERATED, { async: true })
  async onInvoiceGenerated(payload: {
    invoiceId: string;
    clinicId: string;
  }): Promise<void> {
    try {
      const invoice = await this.persistence.invoice.findUnique({
        where: { id: payload.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          grandTotal: true,
          currency: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      });
      if (!invoice) return;

      const patientName = invoice.patient
        ? `${invoice.patient.firstName} ${invoice.patient.lastName}`.trim()
        : 'patient';

      await this.staffNotifications.notifyStaff({
        clinicId: payload.clinicId,
        type: 'INVOICE_PENDING',
        title: `Invoice ${invoice.invoiceNumber ?? ''}`.trim(),
        message: `Invoice generated for ${patientName}.`,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: invoice.grandTotal,
          currency: invoice.currency,
        },
        priority: 'NORMAL',
        sendWhatsApp: false,
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit INVOICE_PENDING notification for invoice ${payload.invoiceId}`,
        error,
      );
    }
  }
}
