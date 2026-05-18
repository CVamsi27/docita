import { z } from "zod";
import {
  UpdateProfileRequest,
  type StaffAccountDeletionRequest,
  type StaffAccountDeletionResponse,
  type UserProfileResponse,
} from "@workspace/types";
import { useAPIMutation } from "../core/use-api-mutation";
import { useAPIQueryValidated } from "../core/use-api-query-validated";

export const useUpdateProfile = () =>
  useAPIMutation<UserProfileResponse, UpdateProfileRequest>(
    "/users/profile",
    "PUT",
  );

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
  useAPIMutation<StaffAccountDeletionResponse, StaffAccountDeletionRequest>(
    "/users/account/delete-request",
    "POST",
  );
