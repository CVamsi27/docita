import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceGeneratedEvent } from '../../application/services/events/invoice-generated.event';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SendMessageUseCase } from '../../../whatsapp/application/use-cases/send-message.use-case';
import { PaymentsService } from '../../application/services/payments.service';

@Injectable()
export class InvoiceEventsListener {
  private readonly logger = new Logger(InvoiceEventsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sendMessage: SendMessageUseCase,
    private readonly paymentsService: PaymentsService,
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

    // Create payment link
    let paymentLink: string | undefined;
    try {
      const paymentSession = await this.paymentsService.createPaymentSession({
        invoiceId: invoice.id,
        amount: invoice.total,
        currency: 'INR',
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

    // Get clinic name
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const message = this.buildFallbackMessage(
      invoice,
      clinic?.name || 'Our Clinic',
      paymentLink,
    );

    // Send WhatsApp notification using DDD use case
    try {
      await this.sendMessage.execute({
        clinicId,
        recipientPhone: invoice.patient.phoneNumber,
        templateName: 'invoice_created',
        variables: {
          patientName: invoice.patient.firstName,
          clinicName: clinic?.name || 'Clinic',
          amount: `₹${invoice.total.toFixed(2)}`,
          link: paymentLink || `https://docita.work/i/${invoiceId}`,
        },
        text: message, // Fallback to builder output
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
    paymentLink?: string,
  ): string {
    const patientName = invoice.patient.firstName;
    const date = new Date(invoice.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    let message = `Hello ${patientName}\n\n`;
    message += `Your invoice from *${clinicName}* is ready!\n\n`;
    message += `Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}\n`;
    message += `Date: ${date}\n`;
    message += `Amount Due: ₹${invoice.total.toFixed(2)}\n\n`;
    if (paymentLink) {
      message += `Pay online: ${paymentLink}\n\n`;
    }
    message += `Thank you for choosing our clinic. Get well soon!`;

    return message;
  }
}
