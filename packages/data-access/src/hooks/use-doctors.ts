import {
  CreateDoctorRequest,
  UpdateDoctorRequest,
  User,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQuery } from "../core/use-api-query";

export interface SignatureUploadSessionResponse {
  token: string;
  uploadUrl: string;
  expiresAt: string | Date;
}

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
