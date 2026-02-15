import { Clinic, User } from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

// Clinic Settings
export interface CustomField {
  name: string;
  type: string;
  required: boolean;
}

export interface ClinicAppSettings {
  // Appearance
  theme?: "light" | "dark" | "system";
  primaryColor?: string;
  compactMode?: boolean;
  
  // Notifications
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  appointmentAlerts?: boolean;
  reportAlerts?: boolean;
  reminderBefore?: string;
  reminderUnit?: string;

  // Security
  twoFactorAuth?: boolean;
  sessionTimeout?: string | number;
  auditLogs?: boolean;

  // WhatsApp
  whatsappAppointmentReminders?: boolean;
  whatsappFollowUpMessages?: boolean;
  whatsappBirthdayWishes?: boolean;
  whatsappMedicineReminders?: boolean;

  // Custom Fields
  customFields?: CustomField[];
}

export const useClinicSettings = () =>
  useAPIQuery<Clinic>(["clinic", "settings"], "/clinic/settings");

export const useClinicMembers = () =>
  useAPIQuery<User[]>(["clinic", "members"], "/clinic/members");

export const useUpdateClinicSettings = () =>
  useAPIMutation<
    Clinic,
    Partial<ClinicAppSettings> & {
      name?: string;
      address?: string;
      phone?: string;
    }
  >("/clinic/settings", "PUT");

export const usePrescriptionDefaults = () =>
  useAPIQuery<{
    defaultInstructions: string;
    defaultFooterText: string;
    includeClinicHeader: boolean;
    includeDoctorSignature: boolean;
    includeQRCode: boolean;
  }>(["clinic", "prescription-defaults"], "/clinic/prescription-defaults");

export const useUpdatePrescriptionDefaults = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
      defaultInstructions?: string;
      defaultFooterText?: string;
      includeClinicHeader?: boolean;
      includeDoctorSignature?: boolean;
      includeQRCode?: boolean;
    }
  >("/clinic/prescription-defaults", "PUT");

// Doctors Management
export const useDoctors = () => useAPIQuery<User[]>(["doctors"], "/doctors");

export const useDoctor = (id: string) =>
  useAPIQuery<User>(["doctors", id], `/doctors/${id}`);

export const useCreateDoctor = () =>
  useAPIMutation<User, Omit<User, "id" | "createdAt" | "updatedAt">>(
    "/doctors",
    "POST",
  );

export const useUpdateDoctor = (id: string) =>
  useAPIMutation<User, Partial<User>>(`/doctors/${id}`, "PUT");

export const useDeleteDoctor = (id: string) =>
  useAPIMutation<void, void>(`/doctors/${id}`, "DELETE");

// Doctor Availability
export const useDoctorSchedules = (doctorId?: string) =>
  useAPIQuery<
    {
      id: string;
      doctorId: string;
      clinicId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive: boolean;
      doctor?: { id: string; name: string };
      clinic?: { id: string; name: string };
    }[]
  >(
    ["doctor-schedules", doctorId || "me"],
    `/doctor-availability/schedules${doctorId ? `?doctorId=${doctorId}` : ""}`,
  );

export const useClinicSchedules = () =>
  useAPIQuery<
    {
      id: string;
      doctorId: string;
      clinicId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive: boolean;
      doctor?: { id: string; name: string; specialization?: string };
    }[]
  >(["clinic-schedules"], "/doctor-availability/schedules/clinic");

export const useCreateDoctorSchedule = () =>
  useAPIMutation<
    Record<string, unknown>,
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
    Record<string, unknown>,
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
    Record<string, unknown>,
    {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    }
  >(`/doctor-availability/schedules/${id}`, "PUT");

export const useDeleteDoctorSchedule = (id: string) =>
  useAPIMutation<Record<string, unknown>, void>(
    `/doctor-availability/schedules/${id}`,
    "DELETE",
  );

export const useDoctorTimeOffs = (doctorId?: string, upcoming?: boolean) =>
  useAPIQuery<
    {
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
    }[]
  >(
    ["doctor-time-offs", doctorId || "me", upcoming ? "upcoming" : "all"],
    `/doctor-availability/time-off${doctorId ? `?doctorId=${doctorId}` : ""}${upcoming ? "&upcoming=true" : ""}`,
  );

export const useCreateDoctorTimeOff = () =>
  useAPIMutation<
    unknown,
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
  useAPIMutation<unknown, void>(
    `/doctor-availability/time-off/${id}`,
    "DELETE",
  );

// User Profile
export const useUpdateProfile = () =>
  useAPIMutation<User, { name?: string; email?: string }>(
    "/users/profile",
    "PUT",
  );

// Subscription & Tier Config
export const useTierConfig = () =>
  useAPIQuery<{
    tiers: Array<{
      id: string;
      tier: number;
      name: string;
      description: string;
      tagline: string;
      color: string;
      pricing: {
        monthly: number | "custom";
        yearly: number | "custom";
        currency: string;
      };
      limits: {
        patients: number;
        doctors: number;
        storageGB: number;
        branches: number;
      };
      features: string[];
    }>;
    featureTierMap: Record<string, number>;
    featureDisplay: Record<string, { name: string; description: string }>;
    intelligenceAddons: Array<{
      feature: string;
      name: string;
      description: string;
      monthlyPrice: number;
      icon: string;
    }>;
    intelligenceBundleDiscount: number;
    intelligenceInfo: {
      name: string;
      description: string;
      tagline: string;
      color: string;
      pricing: {
        monthly: number | "custom";
        yearly: number | "custom";
        currency: string;
      };
      features: string[];
    };
  }>(["tier-config"], "/subscription/config", {
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    refetchOnWindowFocus: true, // Refresh when user returns from admin portal
  });

export const useSubscription = () =>
  useAPIQuery<{
    id: string;
    name: string;
    tier: string;
    tierName: string;
    tierFeatures: string[];
    intelligenceAddon: string;
    intelligenceFeatures: string[];
    subscriptionStatus: string;
    trialEndsAt: string | null;
    isTrialing: boolean;
    trialDaysRemaining: number | null;
  }>(["subscription"], "/subscription", {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns from admin portal
  });
