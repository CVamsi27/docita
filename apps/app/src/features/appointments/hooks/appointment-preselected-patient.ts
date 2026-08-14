export function shouldUpdatePreselectedPatient(
  open: boolean | undefined,
  preselectedPatientId: string | undefined,
  lastPreselectedPatientId: string | undefined,
  patientFieldIsDirty: boolean,
): boolean {
  if (!open) return false;
  if (preselectedPatientId === lastPreselectedPatientId) return false;
  if (!preselectedPatientId) return false;
  return !patientFieldIsDirty;
}
