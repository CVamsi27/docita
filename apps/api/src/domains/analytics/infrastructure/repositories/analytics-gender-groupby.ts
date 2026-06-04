export function normalizeGender(
  gender: unknown,
): 'MALE' | 'FEMALE' | 'OTHER' | null {
  return gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER'
    ? gender
    : null;
}
