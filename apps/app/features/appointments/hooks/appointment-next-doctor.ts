export function findNextAvailableDoctor(
  currentDoctorId: string | undefined,
  unavailableIds: Set<string>,
  filteredDoctors: { id: string }[],
): string {
  return currentDoctorId && unavailableIds.has(currentDoctorId)
    ? (filteredDoctors[0]?.id ?? "")
    : (currentDoctorId ?? "");
}
