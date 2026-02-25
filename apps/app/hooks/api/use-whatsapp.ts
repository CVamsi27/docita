import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

export interface WhatsappLogEntry {
  id: string;
  clinicId: string;
  patientId?: string | null;
  paymentSessionId?: string | null;
  invoiceId?: string | null;
  prescriptionId?: string | null;
  type: string;
  provider?: string;
  phoneNumber: string;
  message: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  patient?: {
    firstName?: string;
    lastName?: string;
  } | null;
}

export interface NotificationUnreadCountResponse {
  count: number;
}

export interface StaffNotificationEntry {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
  priority: string;
  createdAt: string;
}

export const useWhatsappStats = () =>
  useAPIQuery<{
    totalPatients: number;
    subscribers: number;
  }>(["whatsapp", "stats"], "/whatsapp/stats");

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

export const useWhatsappLogs = (limit: number = 50) =>
  useAPIQuery<WhatsappLogEntry[]>(
    ["whatsapp", "logs", limit],
    `/whatsapp/logs?limit=${limit}`,
  );

export const useUnreadNotificationCount = () =>
  useAPIQuery<NotificationUnreadCountResponse>(
    ["whatsapp", "notifications", "unread-count"],
    "/whatsapp/notifications/unread-count",
    {
      refetchInterval: 30_000,
    },
  );

export const useUnreadNotifications = (limit: number = 50) =>
  useAPIQuery<StaffNotificationEntry[]>(
    ["whatsapp", "notifications", "unread", limit],
    `/whatsapp/notifications/unread?limit=${limit}`,
  );

export const useMarkNotificationsRead = () =>
  useAPIMutation<void, { notificationIds: string[] }>(
    "/whatsapp/notifications/mark-read",
    "POST",
    {
      invalidateKeys: [
        ["whatsapp", "notifications", "unread-count"],
        ["whatsapp", "notifications", "unread"],
      ],
    },
  );

export const useMarkAllNotificationsRead = () =>
  useAPIMutation<void, void>("/whatsapp/notifications/mark-all-read", "POST", {
    invalidateKeys: [
      ["whatsapp", "notifications", "unread-count"],
      ["whatsapp", "notifications", "unread"],
    ],
  });

export const useResendPrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-prescription/${id}`, "POST");

export const useResendInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/resend-invoice/${id}`, "POST");

export const useApprovePrescriptionWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-prescription/${id}`, "POST");

export const useApproveInvoiceWhatsApp = (id: string) =>
  useAPIMutation<void, void>(`/whatsapp/approve-invoice/${id}`, "POST");
