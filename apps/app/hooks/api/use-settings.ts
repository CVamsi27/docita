import { formatPickerIsoDate } from "@workspace/utils";
import { z } from "zod";
import {
  Clinic,
  CreateClinicDoctorRequest,
  CreateClinicMemberRequest,
  CreateClinicReceptionistRequest,
  CreateDoctorRequest,
  Feature,
  type SubscriptionCurrentResponse,
  UpdateClinicMemberRequest,
  UpdateClinicSettingsRequest,
  UpdateDoctorRequest,
  UpdateProfileRequest,
  type StaffAccountDeletionRequest,
  type StaffAccountDeletionResponse,
  User,
  type UserProfileResponse,
  type AppClinicSettings,
  subscriptionCurrentResponseSchema,
  availableSlotSchema,
} from "@workspace/types";
import {
  useAPIMutation,
  useAPIQuery,
  useAPIQueryValidated,
} from "@/lib/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";
import { withQueryString } from "@/lib/http/query-string";

export type ClinicAppSettings = AppClinicSettings;

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
  token: string;
  uploadUrl: string;
  expiresAt: string | Date;
}

export const useClinicSettings = (queryOptions?: { enabled?: boolean }) =>
  useAPIQuery<Clinic>(["clinic", "settings"], "/clinic/settings", {
    enabled: queryOptions?.enabled,
  });

export const useClinicMembers = () =>
  useAPIQuery<User[]>(["clinic", "members"], "/clinic/members");

export const useCreateClinicDoctor = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicDoctorRequest>(
    () => {
      if (!clinicId) {
        throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      }
      return `/clinics/${clinicId}/doctors`;
    },
    "POST",
    {
      invalidateKeys: [["clinic", "members"]],
      suppressGlobalErrorToast: true,
    },
  );

export const useCreateClinicReceptionist = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicReceptionistRequest>(
    () => {
      if (!clinicId) {
        throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      }
      return `/clinics/${clinicId}/receptionists`;
    },
    "POST",
    {
      invalidateKeys: [["clinic", "members"]],
      suppressGlobalErrorToast: true,
    },
  );

export const useCreateClinicMember = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicMemberRequest>(
    () => {
      if (!clinicId) {
        throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      }
      return `/clinics/${clinicId}/members`;
    },
    "POST",
    {
      invalidateKeys: [["clinic", "members"]],
      suppressGlobalErrorToast: true,
    },
  );

export const useUpdateClinicMember = () =>
  useAPIMutation<
    User,
    UpdateClinicMemberRequest & {
      memberId: string;
    }
  >(({ memberId }) => `/clinic/members/${memberId}`, "PUT", {
    invalidateKeys: [["clinic", "members"]],
    suppressGlobalErrorToast: true,
  });

export const useDeleteClinicMember = () =>
  useAPIMutation<{ success: boolean }, { memberId: string }>(
    ({ memberId }) => `/clinic/members/${memberId}`,
    "DELETE",
    {
      invalidateKeys: [["clinic", "members"]],
    },
  );

export const useUpdateClinicSettings = () =>
  useAPIMutation<Clinic, UpdateClinicSettingsRequest>(
    "/clinic/settings",
    "PUT",
    {
      invalidateKeys: [["clinic", "settings"]],
    },
  );

export const usePrescriptionDefaults = () =>
  useAPIQuery<PrescriptionDefaults>(
    ["clinic", "prescription-defaults"],
    "/clinic/prescription-defaults",
  );

export const useUpdatePrescriptionDefaults = () =>
  useAPIMutation<{ success: boolean }, Partial<PrescriptionDefaults>>(
    "/clinic/prescription-defaults",
    "PUT",
  );

export const useDoctors = () => useAPIQuery<User[]>(["doctors"], "/doctors");

export const useDoctor = (id: string) =>
  useAPIQuery<User>(["doctors", id], `/doctors/${id}`);

export const useCreateDoctor = () =>
  useAPIMutation<User, CreateDoctorRequest>("/doctors", "POST");

export const useUpdateDoctor = (id: string) =>
  useAPIMutation<User, UpdateDoctorRequest>(`/doctors/${id}`, "PUT");

export const useDeleteDoctor = (id: string) =>
  useAPIMutation<void, void>(`/doctors/${id}`, "DELETE");

export const useCreateDoctorSignatureUploadSession = () =>
  useAPIMutation<SignatureUploadSessionResponse, { doctorId: string }>(
    ({ doctorId }) => `/doctors/${doctorId}/signature-upload-session`,
    "POST",
    {
      invalidateKeys: [["clinic", "members"], ["doctors"]],
      suppressGlobalErrorToast: true,
    },
  );

export const useReverifyDoctorRegistration = () =>
  useAPIMutation<User | null, { doctorId: string }>(
    ({ doctorId }) => `/doctors/${doctorId}/reverify-registration`,
    "POST",
    {
      invalidateKeys: [["clinic", "members"], ["doctors"]],
    },
  );

export const useDoctorSchedules = (doctorId?: string) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  return useAPIQuery<DoctorSchedule[]>(
    ["doctor-schedules", doctorId || "me"],
    `/doctor-availability/schedules${doctorId ? `?doctorId=${doctorId}` : ""}`,
    { enabled: calendarOk },
  );
};

export const useClinicSchedules = () => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  return useAPIQuery<DoctorSchedule[]>(
    ["clinic-schedules"],
    "/doctor-availability/schedules/clinic",
    { enabled: calendarOk },
  );
};

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

export const useDoctorTimeOffs = (doctorId?: string, upcoming?: boolean) => {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  return useAPIQuery<DoctorTimeOff[]>(
    ["doctor-time-offs", doctorId || "me", upcoming ? "upcoming" : "all"],
    `/doctor-availability/time-off${doctorId ? `?doctorId=${doctorId}` : ""}${upcoming ? "&upcoming=true" : ""}`,
    { enabled: calendarOk },
  );
};

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
  >("/doctor-availability/time-off", "POST", {
    invalidateKeys: [["doctor-time-offs"]],
  });

export const useDeleteDoctorTimeOff = (id: string) =>
  useAPIMutation<{ success: boolean }, void>(
    `/doctor-availability/time-off/${id}`,
    "DELETE",
  );

export const useDeleteDoctorTimeOffMutation = () =>
  useAPIMutation<{ success: boolean }, string>(
    (id) => `/doctor-availability/time-off/${id}`,
    "DELETE",
    {
      invalidateKeys: [["doctor-time-offs"]],
    },
  );

const unavailableDoctorsResponseSchema = z.object({
  doctorIds: z.array(z.string()),
});

const doctorAvailabilitySlotRowSchema = availableSlotSchema.extend({
  specialization: z.string().nullable().optional(),
});

export function useUnavailableDoctorIdsForDate(
  date: Date | undefined,
  queryOptions?: { enabled?: boolean },
) {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const dateStr = date ? formatPickerIsoDate(date) : "";
  const enabled =
    calendarOk &&
    Boolean(date && dateStr) &&
    (queryOptions?.enabled ?? true);

  return useAPIQueryValidated(
    ["doctor-unavailability", dateStr],
    withQueryString("/doctor-availability/time-off/unavailable-doctors", {
      date: dateStr,
    }),
    unavailableDoctorsResponseSchema,
    { enabled },
  );
}

export function useDoctorAvailabilitySlots(
  date: Date | undefined,
  doctorId: string | undefined,
  queryOptions?: { enabled?: boolean },
) {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const enabled =
    calendarOk &&
    Boolean(date && doctorId) &&
    (queryOptions?.enabled ?? true);
  const dateKey = date ? formatPickerIsoDate(date) : "";

  return useAPIQueryValidated(
    ["doctor-availability-slots", dateKey, doctorId ?? ""],
    enabled && date && doctorId
      ? withQueryString("/doctor-availability/slots", {
          date: dateKey,
          doctorId,
        })
      : "/doctor-availability/slots",
    z.array(doctorAvailabilitySlotRowSchema),
    {
      enabled,
      staleTime: 0,
      refetchOnMount: "always",
    },
  );
}

export const useMedicalCodingSettings = () => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<{
    enabled: boolean;
    provider: string;
    autoSuggest: boolean;
    preferredSystem: string;
  }>(["clinic", "medical-coding-settings"], "/clinical/medical-coding/settings", {
    enabled: codingOk,
  });
};

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
    UserProfileResponse,
    UpdateProfileRequest
  >("/users/profile", "PUT");

export const useUserProfile = () =>
  useAPIQueryValidated(
    ["users", "profile"],
    "/users/profile",
    z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      createdAt: z.union([z.string(), z.date()]),
      updatedAt: z.union([z.string(), z.date()]),
      sidebarNavOrderOverride: z
        .object({
          track: z.array(z.string()),
          services: z.array(z.string()),
        })
        .nullable()
        .optional(),
    }),
  );

export const useRequestStaffAccountDeletion = () =>
  useAPIMutation<
    StaffAccountDeletionResponse,
    StaffAccountDeletionRequest
  >("/users/account/delete-request", "POST");
