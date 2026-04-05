import {
  Clinic,
  CreateClinicDoctorRequest,
  CreateClinicReceptionistRequest,
  CreateDoctorRequest,
  type SubscriptionCurrentResponse,
  UpdateClinicMemberRequest,
  UpdateClinicSettingsRequest,
  UpdateDoctorRequest,
  UpdateProfileRequest,
  User,
  subscriptionCurrentResponseSchema,
} from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";

export interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

export interface ClinicAppSettings {
  theme?: "light" | "dark" | "system";
  primaryColor?: string;
  compactMode?: boolean;
  whatsappNotifications?: boolean;
  inAppNotifications?: boolean;
  pushNotifications?: boolean;
  appointmentAlerts?: boolean;
  reportAlerts?: boolean;
  reminderBefore?: string;
  reminderUnit?: string;
  twoFactorAuth?: boolean;
  sessionTimeout?: string | number;
  auditLogs?: boolean;
  whatsappAppointmentReminders?: boolean;
  whatsappFollowUpMessages?: boolean;
  whatsappBirthdayWishes?: boolean;
  whatsappMedicineReminders?: boolean;
  customFields?: CustomField[];
  followUpReminderEnabled?: boolean;
  followUpReminderBefore?: string;
  followUpReminderUnit?: string;
  invoiceReminderEnabled?: boolean;
  invoiceReminderBefore?: string;
  invoiceReminderUnit?: string;
  prescriptionReminderEnabled?: boolean;
  prescriptionReminderBefore?: string;
  prescriptionReminderUnit?: string;
  scheduleNotificationEnabled?: boolean;
  scheduleNotificationBefore?: string;
  scheduleNotificationUnit?: string;
  whatsappPreAppointmentEnabled?: boolean;
  whatsappPreAppointmentMinutes?: number;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  clinicId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  doctor?: { id: string; name: string; specialization?: string };
  clinic?: { id: string; name: string };
}

export interface DoctorTimeOff {
  id: string;
  doctorId: string;
  clinicId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  doctor?: { id: string; name: string };
  clinic?: { id: string; name: string };
}

export interface PrescriptionDefaults {
  defaultInstructions: string;
  defaultFooterText: string;
  includeClinicHeader: boolean;
  includeDoctorSignature: boolean;
  includeQRCode: boolean;
}

export interface SignatureUploadSessionResponse {
  id: string;
  expiresAt?: string;
  status?: string;
}

export const useClinicSettings = () =>
  useAPIQuery<Clinic>(["clinic", "settings"], "/clinic/settings");

export const useClinicMembers = () =>
  useAPIQuery<User[]>(["clinic", "members"], "/clinic/members");

export const useCreateClinicDoctor = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicDoctorRequest>(
    () => {
      if (!clinicId) throw new Error("Clinic ID is required");
      return `/clinics/${clinicId}/doctors`;
    },
    "POST",
    {
      invalidateKeys: [["clinic", "members"]],
    },
  );

export const useCreateClinicReceptionist = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicReceptionistRequest>(
    () => {
      if (!clinicId) throw new Error("Clinic ID is required");
      return `/clinics/${clinicId}/receptionists`;
    },
    "POST",
    {
      invalidateKeys: [["clinic", "members"]],
    },
  );

export const useUpdateClinicMember = () =>
  useAPIMutation<
    User,
    UpdateClinicMemberRequest & {
      memberId: string;
    }
  >(
    ({ memberId }) => `/clinic/members/${memberId}`,
    "PUT",
    {
      invalidateKeys: [["clinic", "members"]],
    },
  );

export const useDeleteClinicMember = () =>
  useAPIMutation<{ success: boolean }, { memberId: string }>(
    ({ memberId }) => `/clinic/members/${memberId}`,
    "DELETE",
    {
      invalidateKeys: [["clinic", "members"]],
    },
  );

export const useUpdateClinicSettings = () =>
  useAPIMutation<Clinic, UpdateClinicSettingsRequest>("/clinic/settings", "PUT", {
    invalidateKeys: [["clinic", "settings"]],
  });

export const usePrescriptionDefaults = () =>
  useAPIQuery<PrescriptionDefaults>(
    ["clinic", "prescription-defaults"],
    "/clinic/prescription-defaults",
  );

export const useUpdatePrescriptionDefaults = () =>
  useAPIMutation<
    { success: boolean },
    Partial<PrescriptionDefaults>
  >("/clinic/prescription-defaults", "PUT");

export const useDoctors = () => useAPIQuery<User[]>(["doctors"], "/doctors");

export const useDoctor = (id: string) =>
  useAPIQuery<User>(["doctors", id], `/doctors/${id}`);

export const useCreateDoctor = () =>
  useAPIMutation<User, CreateDoctorRequest>(
    "/doctors",
    "POST",
  );

export const useUpdateDoctor = (id: string) =>
  useAPIMutation<User, UpdateDoctorRequest>(`/doctors/${id}`, "PUT");

export const useDeleteDoctor = (id: string) =>
  useAPIMutation<void, void>(`/doctors/${id}`, "DELETE");

export const useCreateDoctorSignatureUploadSession = () =>
  useAPIMutation<SignatureUploadSessionResponse, { doctorId: string }>(
    ({ doctorId }) => `/doctors/${doctorId}/signature-upload-session`,
    "POST",
  );

export const useReverifyDoctorRegistration = () =>
  useAPIMutation<User | null, { doctorId: string }>(
    ({ doctorId }) => `/doctors/${doctorId}/reverify-registration`,
    "POST",
    {
      invalidateKeys: [["clinic", "members"], ["doctors"]],
    },
  );

export const useDoctorSchedules = (doctorId?: string) =>
  useAPIQuery<DoctorSchedule[]>(
    ["doctor-schedules", doctorId || "me"],
    `/doctor-availability/schedules${doctorId ? `?doctorId=${doctorId}` : ""}`,
  );

export const useClinicSchedules = () =>
  useAPIQuery<DoctorSchedule[]>(["clinic-schedules"], "/doctor-availability/schedules/clinic");

export const useCreateDoctorSchedule = () =>
  useAPIMutation<
    DoctorSchedule,
    {
      doctorId?: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      isActive?: boolean;
    }
  >("/doctor-availability/schedules", "POST");

export const useBulkDoctorSchedules = () =>
  useAPIMutation<
    { success: boolean },
    {
      doctorId?: string;
      schedules: {
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration?: number;
        isActive?: boolean;
      }[];
    }
  >("/doctor-availability/schedules/bulk", "POST");

export const useUpdateDoctorSchedule = (id: string) =>
  useAPIMutation<
    DoctorSchedule,
    {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    }
  >(`/doctor-availability/schedules/${id}`, "PUT");

export const useDeleteDoctorSchedule = (id: string) =>
  useAPIMutation<{ success: boolean }, void>(
    `/doctor-availability/schedules/${id}`,
    "DELETE",
  );

export const useDoctorTimeOffs = (doctorId?: string, upcoming?: boolean) =>
  useAPIQuery<DoctorTimeOff[]>(
    ["doctor-time-offs", doctorId || "me", upcoming ? "upcoming" : "all"],
    `/doctor-availability/time-off${doctorId ? `?doctorId=${doctorId}` : ""}${upcoming ? "&upcoming=true" : ""}`,
  );

export const useCreateDoctorTimeOff = () =>
  useAPIMutation<
    DoctorTimeOff,
    {
      doctorId?: string;
      startDate: string;
      endDate: string;
      reason?: string;
      isFullDay?: boolean;
      startTime?: string;
      endTime?: string;
    }
  >("/doctor-availability/time-off", "POST");

export const useDeleteDoctorTimeOff = (id: string) =>
  useAPIMutation<{ success: boolean }, void>(
    `/doctor-availability/time-off/${id}`,
    "DELETE",
  );

export const useMedicalCodingSettings = () =>
  useAPIQuery<{
    enabled: boolean;
    provider: string;
    autoSuggest: boolean;
    preferredSystem: string;
  }>(["clinic", "medical-coding-settings"], "/clinical/medical-coding/settings");

export const useUpdateMedicalCodingSettings = () =>
  useAPIMutation<
    { success: boolean },
    {
      enabled?: boolean;
      provider?: string;
      autoSuggest?: boolean;
      preferredSystem?: string;
    }
  >("/clinical/medical-coding/settings", "PUT");

export const useSubscription = (queryOptions?: { enabled?: boolean }) => {
  return useAPIQuery<SubscriptionCurrentResponse>(
    ["clinic", "subscription"],
    "/subscription/current",
    {
      ...queryOptions,
      select: (data) => subscriptionCurrentResponseSchema.parse(data),
    },
  );
};

export const useUpdateProfile = () =>
  useAPIMutation<
    { id: string; name?: string; email?: string },
    UpdateProfileRequest
  >("/users/profile", "PATCH");
