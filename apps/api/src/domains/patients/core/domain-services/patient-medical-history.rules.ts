export interface PatientAllergyRecord {
  id: string;
  allergen: string;
}

/** Case-insensitive allergen key for duplicate detection within a patient. */
export function normalizeAllergenKey(allergen: string): string {
  return allergen.trim().toLowerCase();
}

export function findDuplicateAllergy(
  allergen: string,
  existing: readonly PatientAllergyRecord[],
  excludeAllergyId?: string,
): PatientAllergyRecord | undefined {
  const key = normalizeAllergenKey(allergen);
  if (!key) {
    return undefined;
  }
  return existing.find(
    (row) =>
      row.id !== excludeAllergyId &&
      normalizeAllergenKey(row.allergen) === key,
  );
}
