import { resolvePreferredDoctorId } from "./appointment-preferred-doctor";

export function resolveDefaultDoctorId(params: {
  defaultDoctorId?: string;
  unavailableIds: Set<string>;
  user: { id: string; role: string } | undefined;
  filteredDoctors: { id: string }[];
}): string {
  const preferredDoctorId = resolvePreferredDoctorId(params);
  if (preferredDoctorId) return preferredDoctorId;
  return params.filteredDoctors[0]?.id ?? "";
}
