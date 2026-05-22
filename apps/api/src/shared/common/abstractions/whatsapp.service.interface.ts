export interface IWhatsAppService {
  sendMessage(
    phoneNumber: string,
    message: string,
    templateName?: string,
    parameters?: Record<string, string>,
  ): Promise<{ messageId: string; status: 'sent' | 'queued' | 'failed' }>;

  sendAppointmentReminder(
    phoneNumber: string,
    appointmentDetails: {
      appointmentDate: Date;
      appointmentTime: string;
      clinicName: string;
      doctorName: string;
    },
  ): Promise<{ messageId: string; status: string }>;

  sendPrescriptionNotification(
    phoneNumber: string,
    prescriptionDetails: {
      prescriptionId: string;
      medications: string[];
      refillDate?: Date;
    },
  ): Promise<{ messageId: string; status: string }>;

  sendPaymentReminder(
    phoneNumber: string,
    paymentDetails: {
      invoiceAmount: number;
      dueDate: Date;
      invoiceNumber: string;
    },
  ): Promise<{ messageId: string; status: string }>;

  validatePhoneNumber(phoneNumber: string): Promise<{ valid: boolean }>;

  getMessageStatus(messageId: string): Promise<{
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: Date;
  }>;
}

export const WHATSAPP_SERVICE_TOKEN = 'IWhatsAppService';
