import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export type PushNotificationType =
  | 'payment_received'
  | 'payment_failed'
  | 'payment_reminder'
  | 'appointment_reminder'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'prescription_ready'
  | 'invoice_ready'
  | 'general';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendToPatient(
    patientId: string,
    notification: NotificationPayload,
    type: PushNotificationType = 'general',
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(
        `Notification [${type}] for patient ${patientId}: ${notification.title}`,
      );

      return Promise.resolve({ success: true });
    } catch (error) {
      this.logger.error('Failed to process notification', error);
      return Promise.resolve({ success: false });
    }
  }

  async sendToUser(
    userId: string,
    notification: NotificationPayload,
    type: PushNotificationType = 'general',
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(
        `Notification [${type}] for user ${userId}: ${notification.title}`,
      );
      return Promise.resolve({ success: true });
    } catch (error) {
      this.logger.error('Failed to process notification', error);
      return Promise.resolve({ success: false });
    }
  }

  async sendPaymentConfirmation(
    patientId: string,
    amount: number,
    invoiceNumber: string,
    clinicName: string,
  ): Promise<void> {
    await this.sendToPatient(
      patientId,
      {
        title: 'Payment Received',
        body: `₹${amount.toFixed(2)} received for Invoice #${invoiceNumber} at ${clinicName}`,
        data: {
          invoiceNumber,
          amount: amount.toString(),
          clinicName,
        },
      },
      'payment_received',
    );
  }

  async sendPaymentFailed(
    patientId: string,
    amount: number,
    invoiceNumber: string,
    clinicName: string,
  ): Promise<void> {
    await this.sendToPatient(
      patientId,
      {
        title: 'Payment Failed',
        body: `Your payment of ₹${amount.toFixed(2)} for Invoice #${invoiceNumber} could not be processed`,
        data: {
          invoiceNumber,
          amount: amount.toString(),
          clinicName,
        },
      },
      'payment_failed',
    );
  }

  async sendPaymentReminder(
    patientId: string,
    amount: number,
    invoiceNumber: string,
    clinicName: string,
    paymentLink: string,
  ): Promise<void> {
    await this.sendToPatient(
      patientId,
      {
        title: 'Payment Reminder',
        body: `₹${amount.toFixed(2)} due for Invoice #${invoiceNumber} at ${clinicName}`,
        data: {
          invoiceNumber,
          amount: amount.toString(),
          clinicName,
          paymentLink,
        },
      },
      'payment_reminder',
    );
  }

  async sendInvoiceReady(
    patientId: string,
    amount: number,
    invoiceNumber: string,
    clinicName: string,
    paymentLink?: string,
  ): Promise<void> {
    await this.sendToPatient(
      patientId,
      {
        title: 'Invoice Ready',
        body: `Your invoice for ₹${amount.toFixed(2)} from ${clinicName} is ready`,
        data: {
          invoiceNumber,
          amount: amount.toString(),
          clinicName,
          paymentLink: paymentLink || '',
        },
      },
      'invoice_ready',
    );
  }
}
