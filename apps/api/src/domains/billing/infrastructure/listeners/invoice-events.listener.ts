import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceGeneratedEvent } from '@/domains/billing/application/services/events/invoice-generated.event';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { PaymentsService } from '@/domains/billing/application/services/payments.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { DATE_FORMATS, formatCurrency, formatDate } from '@workspace/utils';

@Injectable()
export class InvoiceEventsListener {
  private readonly logger = new Logger(InvoiceEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendMessage: SendMessageUseCase,
    private readonly paymentsService: PaymentsService,
    private readonly configService: AppConfigService,
  ) {}

  @OnEvent('invoice.generated')
  async handleInvoiceGeneratedEvent(event: InvoiceGeneratedEvent) {
    const { invoiceId, clinicId } = event;
    this.logger.log(`Handling invoice.generated event for ${invoiceId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: true,
      },
    });

    if (!invoice || !invoice.patient.phoneNumber) {
      this.logger.warn(
        `Invoice ${invoiceId} skipped: Patient or phone missing`,
      );
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, currency: true },
    });

    let paymentLink: string | undefined;
    try {
      const paymentSession = await this.paymentsService.createPaymentSession({
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: clinic?.currency || this.configService.getCurrencyCode(),
        patientId: invoice.patientId,
        clinicId,
        description: `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
      });
      paymentLink =
        paymentSession.shortUrl || paymentSession.paymentLink || undefined;
    } catch (error) {
      this.logger.error(
        `Failed to create payment link for invoice ${invoice.id}`,
        error,
      );
    }

    const currencyCode =
      clinic?.currency || this.configService.getCurrencyCode();
    const formattedAmount = formatCurrency(invoice.total, {
      currency: currencyCode,
    });

    const message = this.buildFallbackMessage(
      invoice,
      clinic?.name || clinicId,
      currencyCode,
      paymentLink,
    );

    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: invoice.patient.phoneNumber,
        templateName: 'invoice_created',
        variables: {
          patientName: invoice.patient.firstName,
          clinicName: clinic?.name || clinicId,
          amount: formattedAmount,
          link:
            paymentLink ||
            `${this.configService.getFrontendAppUrl()}/invoices/${invoiceId}`,
        },
        text: message,
        metadata: { invoiceId },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send invoice WhatsApp notification for ${invoiceId}`,
        error,
      );
    }
  }

  private buildFallbackMessage(
    invoice: {
      id: string;
      patient: { firstName: string; lastName: string };
      total: number;
      createdAt: Date;
    },
    clinicName: string,
    currencyCode: string,
    paymentLink?: string,
  ): string {
    const patientName = invoice.patient.firstName;
    const date = formatDate(invoice.createdAt, DATE_FORMATS.DATE_MEDIUM);

    let message = `Hello ${patientName}\n\n`;
    message += `Your invoice from *${clinicName}* is ready!\n\n`;
    message += `Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}\n`;
    message += `Date: ${date}\n`;
    const formattedAmount = formatCurrency(invoice.total, {
      currency: currencyCode,
    });
    message += `Amount Due: ${formattedAmount}\n\n`;
    if (paymentLink) {
      message += `Pay online: ${paymentLink}\n\n`;
    }
    message += `Thank you for choosing our clinic. Get well soon!`;

    return message;
  }
}
