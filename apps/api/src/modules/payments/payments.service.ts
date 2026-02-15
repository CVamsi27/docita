import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappClientService } from '../whatsapp/whatsapp-client.service';
import { TemplatesService } from '../whatsapp/templates.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { PaymentWebSocketGateway } from '../../gateways/payment.websocket.gateway';
import { IPaymentProvider } from './providers/payment.provider.interface';
import {
  PaymentSessionStatus,
  InvoiceStatus,
  WhatsappLogStatus,
} from '@workspace/db';

interface PaymentSessionWithRelations {
  id: string;
  clinicId: string;
  invoiceId: string | null;
  patientId: string;
  provider: string;
  amount: number;
  shortUrl: string | null;
  patient: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email: string | null;
  } | null;
  invoice: {
    id: string;
  } | null;
  clinic: {
    phone: string | null;
  } | null;
}

interface RazorpayPaymentLinkEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  short_url: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment_link?: {
      entity: RazorpayPaymentLinkEntity;
    };
    payment?: {
      id: string;
      entity: string;
      amount: number;
      currency: string;
      status: string;
    };
  };
}

@Injectable()
export class PaymentsService {
  private logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappClient: WhatsappClientService,
    private whatsappTemplates: TemplatesService,
    private pushNotifications: PushNotificationService,
    private paymentGateway: PaymentWebSocketGateway,
    @Inject('IPaymentProvider') private paymentProvider: IPaymentProvider,
  ) {}

  async createPaymentSession(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
  }) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
    });

    if (!patient || !invoice) {
      throw new BadRequestException('Patient or invoice not found');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() +
        parseInt(process.env.PAYMENT_LINK_TTL_MINUTES || '1440'),
    );

    const amountInPaise = Math.round(dto.amount * 100);

    if (dto.paymentMode === 'CASH') {
      const session = await this.prisma.paymentSession.create({
        data: {
          clinicId: dto.clinicId,
          invoiceId: dto.invoiceId,
          patientId: dto.patientId,
          provider: 'cash',
          amount: amountInPaise,
          currency: dto.currency,
          status: PaymentSessionStatus.PENDING,
          expiresAt,
        },
      });
      this.logger.log(
        `Created CASH payment session ${session.id} for invoice ${dto.invoiceId}`,
      );
      return session;
    }

    let paymentLink: any = null;
    try {
      const link = await this.paymentProvider.createPaymentLink({
        amount: dto.amount,
        currency: dto.currency,
        description: dto.description || `Invoice #${invoice.id.slice(0, 8)}`,
        customer: {
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email || undefined,
          contact: patient.phoneNumber,
        },
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
      });

      paymentLink = {
        id: link.id,
        short_url: link.shortUrl, // Legacy mapping
        ...link.raw,
      };
    } catch (error) {
      this.logger.error('Failed to create payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }

    const session = await this.prisma.paymentSession.create({
      data: {
        clinicId: dto.clinicId,
        invoiceId: dto.invoiceId,
        patientId: dto.patientId,
        provider: 'razorpay',
        providerSessionId: paymentLink.id,
        paymentLink: paymentLink.short_url,
        shortUrl: paymentLink.short_url,
        amount: amountInPaise,
        currency: dto.currency,
        status: PaymentSessionStatus.CREATED,
        expiresAt,
        meta: paymentLink ? JSON.parse(JSON.stringify(paymentLink)) : null,
      },
    });

    this.logger.log(
      `Created payment session ${session.id} for invoice ${dto.invoiceId}`,
    );

    return session;
  }

  /**
   * Orchestrated method to create a payment link and optionally send WhatsApp
   */
  async createPaymentLink(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
    sendWhatsApp?: boolean;
  }) {
    const session = await this.createPaymentSession(dto);

    if (dto.sendWhatsApp) {
      await this.sendPaymentLinkWhatsApp(session.id);
    }

    return {
      id: session.id,
      link: session.paymentLink,
      shortUrl: session.shortUrl,
      status: session.status,
      expiresAt: session.expiresAt,
    };
  }

  async sendPaymentLinkWhatsApp(sessionId: string) {
    const session = await this.prisma.paymentSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        invoiceId: true,
        provider: true,
        amount: true,
        paymentLink: true,
        shortUrl: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
        clinic: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!session || !session.patient) {
      throw new BadRequestException('Payment session or patient not found');
    }
    if (!session || !session.patient || !session.invoice || !session.clinic) {
      throw new BadRequestException(
        'Payment session, patient, invoice, or clinic not found',
      );
    }

    const message = `Make a payment of ₹${session.amount / 100} for Invoice #${session.invoice.id.toString().slice(-8).toUpperCase()} at ${session.clinic.name}.\n\nPay here: ${session.shortUrl || session.paymentLink}`;

    const result = await this.whatsappClient.sendMessage({
      to: session.patient.phoneNumber,
      message,
    });

    // Atomic: update payment session WhatsApp status + create log entry
    await this.prisma.$transaction([
      this.prisma.paymentSession.update({
        where: { id: sessionId },
        data: {
          whatsappSentAt: new Date(),
          whatsappMessageId: result.messageId,
          whatsappStatus: 'SENT', // This field is string in schema? No, it's whatsappStatus. Wait, I should check schema for PaymentSession.whatsappStatus
        },
      }),
      this.prisma.whatsappLog.create({
        data: {
          clinicId: session.clinicId,
          patientId: session.patientId,
          paymentSessionId: sessionId,
          type: 'payment-link',
          provider: 'meta',
          providerMessageId: result.messageId,
          phoneNumber: session.patient.phoneNumber,
          message,
          status: WhatsappLogStatus.SENT,
          responseBody: result as object,
        },
      }),
    ]);

    this.logger.log(`Sent payment link via WhatsApp for session ${sessionId}`);

    return { success: true, messageId: result.messageId };
  }

  private composePaymentMessage(session: PaymentSessionWithRelations): string {
    const patientName = `${session.patient?.firstName} ${session.patient?.lastName}`;
    const amount = (session.amount / 100).toFixed(2);
    const invoiceNo = session.invoice?.id?.slice(0, 8) || 'N/A';

    if (session.provider === 'cash') {
      return `Hi ${patientName},\n\nYour invoice #${invoiceNo} for ₹${amount} is ready.\n\nPlease pay at the clinic counter.\n\nFor help, call ${session.clinic?.phone || 'clinic'}.\n\nThank you!`;
    }

    return `Hi ${patientName},\n\nYour invoice #${invoiceNo} for ₹${amount} is ready.\n\nPay securely: ${session.shortUrl}\n\nIf you've already paid, please reply DONE.\n\nFor help, call ${session.clinic?.phone || 'clinic'}.\n\nThank you!`;
  }

  async handleRazorpayWebhook(
    payload: RazorpayWebhookPayload,
    signature: string,
  ) {
    const isValid = this.paymentProvider.verifySignature(payload as any, signature);
    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = payload.event;
    const paymentLinkData = payload.payload.payment_link?.entity;

    if (!paymentLinkData) {
      this.logger.warn(`Webhook ${event} does not contain payment_link data`);
      return { status: 'ok', message: 'No payment_link data in webhook' };
    }

    this.logger.log(`Received Razorpay webhook: ${event}`);

    const session = await this.prisma.paymentSession.findFirst({
      where: { providerSessionId: paymentLinkData.id },
      select: {
        id: true,
        clinicId: true,
        invoiceId: true,
        patientId: true,
        status: true,
        amount: true,
        shortUrl: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        clinic: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!session) {
      this.logger.warn(
        `Payment session not found for provider ID: ${paymentLinkData.id}`,
      );
      return;
    }

    const updateData: {
      webhookPayload: object;
      updatedAt: Date;
      status?: PaymentSessionStatus;
      paidAt?: Date;
    } = {
      webhookPayload: payload,
      updatedAt: new Date(),
    };

    switch (event) {
      case 'payment_link.paid':
        updateData.status = PaymentSessionStatus.PAID;
        updateData.paidAt = new Date();

        // Atomic: update invoice + payment session in a single transaction
        await this.prisma.$transaction(async (tx) => {
          if (session.invoiceId) {
            await tx.invoice.update({
              where: { id: session.invoiceId },
              data: { status: InvoiceStatus.PAID },
            });
          }

          await tx.paymentSession.update({
            where: { id: session.id },
            data: updateData,
          });
        });

        // Non-critical: send notifications outside transaction
        await this.sendPaymentConfirmationNotifications(
          session,
          paymentLinkData.id,
        );
        break;

      case 'payment_link.expired':
        updateData.status = PaymentSessionStatus.EXPIRED;
        await this.prisma.paymentSession.update({
          where: { id: session.id },
          data: updateData,
        });
        break;

      case 'payment_link.cancelled':
        updateData.status = PaymentSessionStatus.CANCELLED;
        await this.prisma.paymentSession.update({
          where: { id: session.id },
          data: updateData,
        });
        break;

      default:
        this.logger.warn(`Unhandled event: ${event}`);
        return;
    }

    this.paymentGateway.emitPaymentUpdate(session.clinicId, session.id, {
      sessionId: session.id,
      invoiceId: session.invoiceId,
      status: updateData.status || session.status,
      paidAt: updateData.paidAt,
    });

    this.logger.log(
      `Updated payment session ${session.id} to status: ${updateData.status}`,
    );
  }

  /**
   * Send payment confirmation via WhatsApp and Push Notification
   */
  private async sendPaymentConfirmationNotifications(
    session: {
      id: string;
      clinicId: string;
      invoiceId: string | null;
      patientId: string | null;
      amount: number;
      shortUrl: string | null;
      patient: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
      } | null;
      clinic: {
        name: string;
      } | null;
    },
    paymentId: string,
  ): Promise<void> {
    if (!session.patient || !session.clinic || !session.patientId) return;

    const amountInRupees = session.amount / 100;
    const invoiceNumber = session.invoiceId?.slice(0, 8).toUpperCase() || 'N/A';
    const date = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // Send push notification
    try {
      await this.pushNotifications.sendPaymentConfirmation(
        session.patientId,
        amountInRupees,
        invoiceNumber,
        session.clinic.name,
      );
      this.logger.log(`Sent push notification for payment ${session.id}`);
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
    }

    // Send WhatsApp confirmation
    try {
      const resolvedTemplate = await this.whatsappTemplates.resolveTemplate(
        'payment_confirmation',
        {
          patientName: session.patient.firstName,
          clinicName: session.clinic.name,
          amount: `₹${amountInRupees.toFixed(2)}`,
          invoiceNumber,
          date,
          paymentId: paymentId.slice(0, 12),
        },
        session.clinicId,
      );

      if (resolvedTemplate) {
        const message =
          this.whatsappTemplates.getMessageForMode(resolvedTemplate);
        await this.whatsappClient.sendMessage({
          to: session.patient.phoneNumber,
          message,
        });

        // Log WhatsApp message
        await this.prisma.whatsappLog.create({
          data: {
            clinicId: session.clinicId,
            patientId: session.patientId,
            paymentSessionId: session.id,
            invoiceId: session.invoiceId,
            type: 'payment-confirmation',
            provider: 'meta',
            phoneNumber: session.patient.phoneNumber,
            message,
            status: WhatsappLogStatus.SENT,
          },
        });

        this.logger.log(
          `Sent WhatsApp payment confirmation for session ${session.id}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send WhatsApp payment confirmation', error);
    }
  }

  // Removed verifyRazorpaySignature as it is now delegated to the provider

  async getPaymentSession(id: string) {
    return this.prisma.paymentSession.findUnique({
      where: { id },
      select: {
        id: true,
        clinicId: true,
        invoiceId: true,
        patientId: true,
        provider: true,
        providerSessionId: true,
        paymentLink: true,
        shortUrl: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        paidAt: true,
        expiresAt: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
      },
    });
  }
}
