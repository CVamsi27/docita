import { fetchAPI, useAPIMutation, useAPIQuery } from "../../lib/api-core";

// WhatsApp Statistics
export const useWhatsappStats = () =>
  useAPIQuery<{
    totalPatients: number;
    subscribers: number;
  }>(["whatsapp", "stats"], "/whatsapp/stats");

// WhatsApp Settings
export const useWhatsAppSettings = () =>
  useAPIQuery<{
    appointmentReminders: boolean;
    followUpMessages: boolean;
    birthdayWishes: boolean;
    medicineReminders: boolean;
    labReportNotifications: boolean;
    emergencyAlerts: boolean;
  }>(["whatsapp", "settings"], "/whatsapp/settings");

export const useUpdateWhatsAppSettings = () =>
  useAPIMutation<
    unknown,
    {
      appointmentReminders?: boolean;
      followUpMessages?: boolean;
      birthdayWishes?: boolean;
      medicineReminders?: boolean;
      labReportNotifications?: boolean;
      emergencyAlerts?: boolean;
    }
  >("/whatsapp/settings", "PUT");

// Messaging Operations
export const useCreateMedicineReminder = () =>
  useAPIMutation<
    unknown,
    {
      medicineName: string;
      dosage: string;
      frequency: string;
      reminderTime: string;
      patientPhone: string;
    }
  >("/whatsapp/medicine-reminder", "POST");

export const useCreateWhatsAppBroadcast = () =>
  useAPIMutation<
    unknown,
    {
      campaignName: string;
      message: string;
      sendToAllPatients: boolean;
      sendToSpecificPatients: boolean;
      scheduleTime?: string;
    }
  >("/whatsapp/broadcast", "POST");

export const useResendPrescriptionWhatsApp = (id: string) =>
  useAPIMutation<unknown, void>(`/whatsapp/resend-prescription/${id}`, "POST");

export const useResendInvoiceWhatsApp = (id: string) =>
  useAPIMutation<unknown, void>(`/whatsapp/resend-invoice/${id}`, "POST");

export const useApprovePrescriptionWhatsApp = (id: string) =>
  useAPIMutation<unknown, void>(`/whatsapp/approve-prescription/${id}`, "POST");

export const useApproveInvoiceWhatsApp = (id: string) =>
  useAPIMutation<unknown, void>(`/whatsapp/approve-invoice/${id}`, "POST");
