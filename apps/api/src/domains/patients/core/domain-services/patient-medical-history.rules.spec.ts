import { describe, expect, it } from '@jest/globals';
import {
  findDuplicateAllergy,
  normalizeAllergenKey,
} from './patient-medical-history.rules';

describe('patient-medical-history.rules', () => {
  const existing = [
    { id: 'allergy-1', allergen: 'Penicillin' },
    { id: 'allergy-2', allergen: 'Peanuts' },
  ];

  it('normalizes allergen keys case-insensitively', () => {
    expect(normalizeAllergenKey('  Penicillin ')).toBe('penicillin');
  });

  it('finds duplicate allergens', () => {
    const duplicate = findDuplicateAllergy('penicillin', existing);
    expect(duplicate?.id).toBe('allergy-1');
  });

  it('excludes the allergy being updated', () => {
    const duplicate = findDuplicateAllergy('Penicillin', existing, 'allergy-1');
    expect(duplicate).toBeUndefined();
  });
});
