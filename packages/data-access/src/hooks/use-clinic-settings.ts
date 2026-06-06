import {
  Clinic,
  CreateClinicDoctorRequest,
  CreateClinicMemberRequest,
  CreateClinicReceptionistRequest,
  UpdateClinicMemberRequest,
  UpdateClinicSettingsRequest,
  User,
  type AppClinicSettings,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";

export type ClinicAppSettings = AppClinicSettings;

export const useClinicSettings = (queryOptions?: { enabled?: boolean }) =>
  useAPIQuery<Clinic>(queryKeys.clinic.settings(), "/clinic/settings", {
    enabled: queryOptions?.enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

export const useClinicMembers = () =>
  useAPIQuery<User[]>(queryKeys.clinic.members(), "/clinic/members");

export const useCreateClinicDoctor = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicDoctorRequest>(
    () => {
      if (!clinicId) throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      return `/clinics/${clinicId}/doctors`;
    },
    "POST",
    {
      invalidateKeys: [queryKeys.clinic.members()],
      suppressGlobalErrorToast: true,
    },
  );

export const useCreateClinicReceptionist = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicReceptionistRequest>(
    () => {
      if (!clinicId) throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      return `/clinics/${clinicId}/receptionists`;
    },
    "POST",
    {
      invalidateKeys: [queryKeys.clinic.members()],
      suppressGlobalErrorToast: true,
    },
  );

export const useCreateClinicMember = (clinicId?: string) =>
  useAPIMutation<User, CreateClinicMemberRequest>(
    () => {
      if (!clinicId) throw new Error(
          "We could not identify this facility. Please refresh and try again.",
        );
      return `/clinics/${clinicId}/members`;
    },
    "POST",
    {
      invalidateKeys: [queryKeys.clinic.members()],
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
    invalidateKeys: [queryKeys.clinic.members()],
    suppressGlobalErrorToast: true,
  });

export const useDeleteClinicMember = () =>
  useAPIMutation<{ success: boolean }, { memberId: string }>(
    ({ memberId }) => `/clinic/members/${memberId}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.clinic.members()],
    },
  );

export const useUpdateClinicSettings = () =>
  useAPIMutation<Clinic, UpdateClinicSettingsRequest>(
    "/clinic/settings",
    "PUT",
    {
      invalidateKeys: [queryKeys.clinic.settings()],
    },
  );
