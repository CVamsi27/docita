export interface IEmailService {
  send(
    to: string,
    subject: string,
    content: string,
    options?: {
      cc?: string[];
      bcc?: string[];
      isHtml?: boolean;
      attachments?: Array<{
        filename: string;
        content: Buffer;
        contentType: string;
      }>;
    },
  ): Promise<{
    messageId: string;
    status: 'sent' | 'queued' | 'failed';
  }>;

  sendFromTemplate(
    to: string,
    templateName: string,
    templateData: Record<string, unknown>,
  ): Promise<{
    messageId: string;
    status: 'sent' | 'queued' | 'failed';
  }>;

  sendAppointmentConfirmation(
    to: string,
    appointmentDetails: {
      appointmentDate: Date;
      appointmentTime: string;
      clinicName: string;
      doctorName: string;
      location: string;
    },
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  sendAppointmentReminder(
    to: string,
    appointmentDetails: {
      appointmentDate: Date;
      appointmentTime: string;
      doctorName: string;
      clinicName: string;
    },
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  sendInvoice(
    to: string,
    invoiceDetails: {
      invoiceNumber: string;
      totalAmount: number;
      dueDate: Date;
      clinicName: string;
    },
    invoicePdf?: Buffer,
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  sendPrescription(
    to: string,
    prescriptionDetails: {
      prescriptionId: string;
      medications: string[];
      prescribedBy: string;
      prescriptionDate: Date;
    },
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  sendPasswordReset(
    to: string,
    resetLink: string,
    expiryMinutes: number,
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  validateEmail(email: string): Promise<{
    valid: boolean;
    reason?: string;
  }>;

  getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    timestamp: Date;
  }>;
}

export const EMAIL_SERVICE_TOKEN = 'IEmailService';
