import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PaymentSessionStatus } from '@workspace/db';

/**
 * Ensures each generated invoice has an online payment session for patient pay links.
 * WhatsApp delivery for invoices is handled by {@link WhatsappEventListener}.
 */
@Injectable()
export class InvoiceEventsListener {
  private readonly logger = new Logger(InvoiceEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: AppConfigService,
  ) {}

  @OnEvent(ApplicationEvents.INVOICE_GENERATED)
  async handleInvoiceGeneratedEvent(event: InvoiceGeneratedEvent) {
    const { invoiceId, clinicId } = event;
    this.logger.log(`Ensuring payment session for invoice ${invoiceId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, clinicId },
      include: {
        patient: { select: { id: true, phoneNumber: true } },
        paymentSessions: {
          where: {
            status: {
              in: [PaymentSessionStatus.CREATED, PaymentSessionStatus.PENDING],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!invoice?.patient.phoneNumber) {
      this.logger.warn(
        `Invoice ${invoiceId} skipped: patient or phone missing for payment session`,
      );
      return;
    }

    if (invoice.paymentSessions.length > 0) {
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, currency: true },
    });

    try {
      await this.paymentsService.createPaymentSession({
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: clinic?.currency || this.configService.getCurrencyCode(),
        patientId: invoice.patientId,
        clinicId,
        description: `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create payment link for invoice ${invoice.id}`,
        error,
      );
    }
  }
}
