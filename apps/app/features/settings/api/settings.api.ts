import { api } from "@/lib/api-client";

export const settingsApi = {
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/auth/change-password", data),
};
