import { api } from "@/lib/api-client";
import type { Clinic, PrescriptionTemplate, User } from "@workspace/types";

export interface ReminderSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  appointmentReminderTiming: number; 
  followUpReminderTiming: number; 
}

export interface InviteMemberInput {
  email: string;
  role: string;
  name?: string;
}

export const settingsApi = {

  getClinicSettings: () => api.get<Clinic>("/settings/clinic"),
  updateClinicSettings: (data: Partial<Clinic>) =>
    api.patch<Clinic>("/settings/clinic", data),

  getDoctors: () => api.get<User[]>("/settings/doctors"),
  createDoctor: (data: Partial<User>) =>
    api.post<User>("/settings/doctors", data),
  updateDoctor: (id: string, data: Partial<User>) =>
    api.patch<User>(`/settings/doctors/${id}`, data),
  deleteDoctor: (id: string) => api.delete(`/settings/doctors/${id}`),

  getMembers: () => api.get<User[]>("/settings/members"),
  inviteMember: (data: InviteMemberInput) =>
    api.post<User>("/settings/members/invite", data),
  updateMemberRole: (id: string, role: string) =>
    api.patch<User>(`/settings/members/${id}/role`, { role }),

  getTemplates: () => api.get<PrescriptionTemplate[]>("/settings/templates"),
  createTemplate: (data: Partial<PrescriptionTemplate>) =>
    api.post<PrescriptionTemplate>("/settings/templates", data),

  getReminderSettings: () => api.get<ReminderSettings>("/settings/reminders"),
  updateReminderSettings: (data: Partial<ReminderSettings>) =>
    api.patch<ReminderSettings>("/settings/reminders", data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", data),
};
