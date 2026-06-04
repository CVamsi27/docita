import type { Patient } from "@workspace/types";

export function mergePatientsWithPreselected(
  searchedPatients: Patient[],
  preselectedPatient: Patient | undefined,
  preselectedPatientId: string | undefined,
): Patient[] {
  if (!preselectedPatient || !preselectedPatientId) return searchedPatients;
  const hasPreselected = searchedPatients.some(
    (patient) => patient.id === preselectedPatientId,
  );
  return hasPreselected
    ? searchedPatients
    : [preselectedPatient, ...searchedPatients];
}
