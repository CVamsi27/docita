import { isDoctor } from "@/lib/auth/permissions";

export function resolvePreferredDoctorId(params: {
  defaultDoctorId?: string;
  unavailableIds: Set<string>;
  user: { id: string; role: string } | undefined;
}): string {
  if (
    params.defaultDoctorId &&
    !params.unavailableIds.has(params.defaultDoctorId)
  ) {
    return params.defaultDoctorId;
  }
  if (!isDoctor(params.user?.role) || !params.user?.id) return "";
  return params.unavailableIds.has(params.user.id) ? "" : params.user.id;
}
