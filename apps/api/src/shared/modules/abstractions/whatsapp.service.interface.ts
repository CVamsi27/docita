/**
 * WhatsApp Service Interface
 *
 * Defines the contract for sending WhatsApp messages.
 * Allows multiple implementations (Cloud API, On-Premise, etc.)
 *
 * @interface IWhatsAppService
 */
export interface IWhatsAppService {
  /**
   * Send a WhatsApp message to a patient
   * @param phoneNumber - Patient's phone number (format: +[country_code][number])
   * @param message - Message content
   * @param templateName - Optional template name for templated messages
   * @param parameters - Optional template parameters
   * @returns Promise with message ID or error
   */
  sendMessage(
    phoneNumber: string,
    message: string,
    templateName?: string,
    parameters?: Record<string, string>,
  ): Promise<{ messageId: string; status: 'sent' | 'queued' | 'failed' }>;

  /**
   * Send appointment reminder
   * @param phoneNumber - Patient's phone number
   * @param appointmentDetails - Appointment details for the message
   * @returns Promise with message ID
   */
  sendAppointmentReminder(
    phoneNumber: string,
    appointmentDetails: {
      appointmentDate: Date;
      appointmentTime: string;
      clinicName: string;
      doctorName: string;
    },
  ): Promise<{ messageId: string; status: string }>;

  /**
   * Send prescription notification
   * @param phoneNumber - Patient's phone number
   * @param prescriptionDetails - Prescription details
   * @returns Promise with message ID
   */
  sendPrescriptionNotification(
    phoneNumber: string,
    prescriptionDetails: {
      prescriptionId: string;
      medications: string[];
      refillDate?: Date;
    },
  ): Promise<{ messageId: string; status: string }>;

  /**
   * Send payment reminder
   * @param phoneNumber - Patient's phone number
   * @param paymentDetails - Payment details
   * @returns Promise with message ID
   */
  sendPaymentReminder(
    phoneNumber: string,
    paymentDetails: {
      invoiceAmount: number;
      dueDate: Date;
      invoiceNumber: string;
    },
  ): Promise<{ messageId: string; status: string }>;

  /**
   * Check if a phone number is valid for WhatsApp
   * @param phoneNumber - Phone number to validate
   * @returns Promise with validation result
   */
  validatePhoneNumber(phoneNumber: string): Promise<{ valid: boolean }>;

  /**
   * Get message delivery status
   * @param messageId - Message ID from send operation
   * @returns Promise with message status
   */
  getMessageStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: Date;
  }>;
}

export const WHATSAPP_SERVICE_TOKEN = 'IWhatsAppService';
