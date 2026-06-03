/** check-as-cast-density: allow-file — encrypt/decrypt only mutates known string fields on a generic patient record. */
export function mapPatientRecordFields<T extends Record<string, unknown>>(
  patient: T,
  mapValue: (plain: string) => string,
): T {
  const mapped: Record<string, unknown> = { ...patient };
  const fields = [
    'email',
    'phoneNumber',
    'address',
    'emergencyContactPhone',
    'emergencyContactName',
    'firstName',
    'lastName',
    'preferredName',
    'insuranceProvider',
    'insurancePolicyNumber',
    'insuranceGroupNumber',
    'allergies',
    'abhaAddress',
  ] as const;

  for (const field of fields) {
    const value = mapped[field];
    if (typeof value === 'string' && value.length > 0) {
      mapped[field] = mapValue(value);
    }
  }

  return mapped as T;
}
