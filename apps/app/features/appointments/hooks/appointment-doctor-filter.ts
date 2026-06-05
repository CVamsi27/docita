export function computeFilteredDoctors<T extends { id: string }>(
  doctors: T[],
  unavailableIds: Set<string>,
): T[] {
  return doctors.filter((doctor) => !unavailableIds.has(doctor.id));
}

export function toUnavailableIdSet(
  doctorIds: string[] | undefined,
): Set<string> {
  return new Set(doctorIds ?? []);
}
