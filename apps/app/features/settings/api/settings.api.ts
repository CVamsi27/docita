import { api } from "@/lib/api-client";
import type { Clinic, PrescriptionTemplate, User } from "@workspace/types";

export interface ReminderSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  appointmentReminderTiming: number; // hours before
  followUpReminderTiming: number; // days after
}

export interface InviteMemberInput {
  email: string;
  role: string;
  name?: string;
}

/**
 * Settings API Client
 */
export const settingsApi = {
  // Clinic Settings
  getClinicSettings: () => api.get<Clinic>("/settings/clinic"),
  updateClinicSettings: (data: Partial<Clinic>) => api.patch<Clinic>("/settings/clinic", data),

  // Doctor Settings
  getDoctors: () => api.get<User[]>("/settings/doctors"),
  createDoctor: (data: Partial<User>) => api.post<User>("/settings/doctors", data),
  updateDoctor: (id: string, data: Partial<User>) =>
    api.patch<User>(`/settings/doctors/${id}`, data),
  deleteDoctor: (id: string) => api.delete(`/settings/doctors/${id}`),

  // Member Settings
  getMembers: () => api.get<User[]>("/settings/members"),
  inviteMember: (data: InviteMemberInput) => api.post<User>("/settings/members/invite", data),
  updateMemberRole: (id: string, role: string) =>
    api.patch<User>(`/settings/members/${id}/role`, { role }),

  // Prescription Templates
  getTemplates: () => api.get<PrescriptionTemplate[]>("/settings/templates"),
  createTemplate: (data: Partial<PrescriptionTemplate>) => api.post<PrescriptionTemplate>("/settings/templates", data),

  // Reminder Settings
  getReminderSettings: () => api.get<ReminderSettings>("/settings/reminders"),
  updateReminderSettings: (data: Partial<ReminderSettings>) => api.patch<ReminderSettings>("/settings/reminders", data),
};
