import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

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
    void,
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
    void,
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
    void,
    {
      campaignName: string;
      message: string;
      sendToAllPatients: boolean;
      sendToSpecificPatients: boolean;
      scheduleTime?: string;
    }
  >("/whatsapp/broadcast", "POST");

// Dynamic mutations that accept ID as variable
export const useSendPrescriptionWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-prescription/${id}`,
    "POST",
  );

export const useSendInvoiceWhatsApp = () =>
  useAPIMutation<void, { id: string }>(
    ({ id }) => `/whatsapp/resend-invoice/${id}`,
    "POST",
  );

// Existing static hooks (kept for backward compatibility if used)
export const useResendPrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-prescription/${id}`, "POST");

export const useResendInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-invoice/${id}`, "POST");

export const useApprovePrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-prescription/${id}`, "POST");

export const useApproveInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-invoice/${id}`, "POST");
