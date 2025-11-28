import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PaymentGateway } from '../../gateways/payment.gateway';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay;

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private paymentGateway: PaymentGateway,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
    });
  }

  async createPaymentSession(dto: {
    invoiceId: string;
    amount: number;
    currency: string;
    patientId: string;
    clinicId: string;
    description?: string;
    paymentMode?: 'ONLINE' | 'CASH';
  }) {
    // Get patient and invoice details
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
    });

    if (!patient || !invoice) {
      throw new BadRequestException('Patient or invoice not found');
    }

    // Calculate expiry (24 hours from now)
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
          status: 'pending',
          expiresAt,
        },
      });
      this.logger.log(
        `Created CASH payment session ${session.id} for invoice ${dto.invoiceId}`,
      );
      return session;
    }

    // Create Razorpay payment link
    let paymentLink;
    try {
      paymentLink = await this.razorpay.paymentLink.create({
        amount: amountInPaise,
        currency: dto.currency,
        description: dto.description || `Invoice #${invoice.id.slice(0, 8)}`,
        customer: {
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email || undefined,
          contact: patient.phoneNumber,
        },
        notify: {
          sms: false, // We'll send via WhatsApp
          email: false,
        },
        reminder_enable: false,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        callback_method: 'get',
      });
    } catch (error) {
      this.logger.error('Failed to create Razorpay payment link', error);
      throw new BadRequestException('Failed to create payment link');
    }

    // Save to database
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
        status: 'created',
        expiresAt,
        meta: {
          razorpayResponse: paymentLink,
        },
      },
    });

    this.logger.log(
      `Created payment session ${session.id} for invoice ${dto.invoiceId}`,
    );

    return session;
  }

  async sendPaymentLinkWhatsApp(sessionId: string) {
    const session = await this.prisma.paymentSession.findUnique({
      where: { id: sessionId },
      include: {
        patient: true,
        invoice: true,
        clinic: true,
      },
    });

    if (!session || !session.patient) {
      throw new BadRequestException('Payment session or patient not found');
    }

    // Check WhatsApp consent (optional for now, can be enforced later)
    // if (!session.patient.whatsappConsent) {
    //   throw new BadRequestException('Patient has not consented to WhatsApp messages');
    // }

    // Compose message
    const message = this.composePaymentMessage(session);

    // Send via Twilio WhatsApp
    const result = await this.whatsapp.sendMessage({
      to: session.patient.phoneNumber,
      message,
    });

    // Update session
    await this.prisma.paymentSession.update({
      where: { id: sessionId },
      data: {
        whatsappSentAt: new Date(),
        whatsappMessageId: result.messageId,
        whatsappStatus: 'sent',
      },
    });

    // Log WhatsApp message
    await this.prisma.whatsappLog.create({
      data: {
        clinicId: session.clinicId,
        patientId: session.patientId,
        paymentSessionId: sessionId,
        type: 'payment-link',
        provider: 'twilio',
        providerMessageId: result.messageId,
        phoneNumber: session.patient.phoneNumber,
        message,
        status: 'sent',
        responseBody: result as any,
      },
    });

    this.logger.log(`Sent payment link via WhatsApp for session ${sessionId}`);

    return { success: true, messageId: result.messageId };
  }

  private composePaymentMessage(session: any): string {
    const patientName = `${session.patient.firstName} ${session.patient.lastName}`;
    const amount = (session.amount / 100).toFixed(2);
    const invoiceNo = session.invoice?.id?.slice(0, 8) || 'N/A';

    if (session.provider === 'cash') {
      return `Hi ${patientName},\n\nYour invoice #${invoiceNo} for ₹${amount} is ready.\n\nPlease pay at the clinic counter.\n\nFor help, call ${session.clinic?.phone || 'clinic'}.\n\nThank you!`;
    }

    return `Hi ${patientName},\n\nYour invoice #${invoiceNo} for ₹${amount} is ready.\n\nPay securely: ${session.shortUrl}\n\nIf you've already paid, please reply DONE.\n\nFor help, call ${session.clinic?.phone || 'clinic'}.\n\nThank you!`;
  }

  async handleRazorpayWebhook(payload: any, signature: string) {
    // Verify signature
    const isValid = this.verifyRazorpaySignature(payload, signature);
    if (!isValid) {
      this.logger.error('Invalid Razorpay webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    const event = payload.event;
    const paymentLinkData = payload.payload.payment_link.entity;

    this.logger.log(`Received Razorpay webhook: ${event}`);

    // Find payment session
    const session = await this.prisma.paymentSession.findFirst({
      where: { providerSessionId: paymentLinkData.id },
      include: { invoice: true },
    });

    if (!session) {
      this.logger.warn(
        `Payment session not found for provider ID: ${paymentLinkData.id}`,
      );
      return;
    }

    // Update session based on event
    const updateData: any = {
      webhookPayload: payload,
      updatedAt: new Date(),
    };

    switch (event) {
      case 'payment_link.paid':
        updateData.status = 'paid';
        updateData.paidAt = new Date();

        // Update invoice status
        if (session.invoiceId) {
          await this.prisma.invoice.update({
            where: { id: session.invoiceId },
            data: { status: 'paid' },
          });
        }
        break;

      case 'payment_link.expired':
        updateData.status = 'expired';
        break;

      case 'payment_link.cancelled':
        updateData.status = 'cancelled';
        break;

      default:
        this.logger.warn(`Unhandled event: ${event}`);
    }

    await this.prisma.paymentSession.update({
      where: { id: session.id },
      data: updateData,
    });

    // Emit real-time update via Socket.IO
    this.paymentGateway.emitPaymentUpdate(session.clinicId, session.id, {
      sessionId: session.id,
      invoiceId: session.invoiceId,
      status: updateData.status,
      paidAt: updateData.paidAt,
    });

    this.logger.log(
      `Updated payment session ${session.id} to status: ${updateData.status}`,
    );
  }

  private verifyRazorpaySignature(payload: any, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return true; // Skip verification if secret not set (dev mode)

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }

  async getPaymentSession(id: string) {
    return this.prisma.paymentSession.findUnique({
      where: { id },
      include: {
        patient: true,
        invoice: true,
      },
    });
  }
}
