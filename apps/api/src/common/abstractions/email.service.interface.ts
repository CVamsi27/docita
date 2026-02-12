/**
 * Email Service Interface
 *
 * Defines the contract for sending emails.
 * Allows multiple email provider implementations (SendGrid, AWS SES, etc.)
 *
 * @interface IEmailService
 */
export interface IEmailService {
  /**
   * Send a basic email
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param content - Email content (HTML or plain text)
   * @param options - Additional options
   * @returns Promise with send result
   */
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

  /**
   * Send email using a predefined template
   * @param to - Recipient email address
   * @param templateName - Name of the template
   * @param templateData - Data to populate template variables
   * @returns Promise with send result
   */
  sendFromTemplate(
    to: string,
    templateName: string,
    templateData: Record<string, unknown>,
  ): Promise<{
    messageId: string;
    status: 'sent' | 'queued' | 'failed';
  }>;

  /**
   * Send appointment confirmation email
   * @param to - Patient email
   * @param appointmentDetails - Appointment details
   * @returns Promise with send result
   */
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

  /**
   * Send appointment reminder (24 hours before)
   * @param to - Patient email
   * @param appointmentDetails - Appointment details
   * @returns Promise with send result
   */
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

  /**
   * Send invoice/receipt
   * @param to - Customer email
   * @param invoiceDetails - Invoice details
   * @param invoicePdf - Optional PDF attachment
   * @returns Promise with send result
   */
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

  /**
   * Send prescription notification
   * @param to - Patient email
   * @param prescriptionDetails - Prescription details
   * @returns Promise with send result
   */
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

  /**
   * Send password reset email
   * @param to - User email
   * @param resetLink - Password reset link
   * @param expiryMinutes - Link expiry time in minutes
   * @returns Promise with send result
   */
  sendPasswordReset(
    to: string,
    resetLink: string,
    expiryMinutes: number,
  ): Promise<{
    messageId: string;
    status: string;
  }>;

  /**
   * Check if an email address is valid
   * @param email - Email to validate
   * @returns Promise with validation result
   */
  validateEmail(email: string): Promise<{
    valid: boolean;
    reason?: string;
  }>;

  /**
   * Get email delivery status
   * @param messageId - Message ID from send operation
   * @returns Promise with delivery status
   */
  getDeliveryStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    timestamp: Date;
  }>;
}

export const EMAIL_SERVICE_TOKEN = 'IEmailService';
