import { describe, expect, it } from '@jest/globals';
import { getClinicSettings } from './onboarding-settings';

describe('getClinicSettings', () => {
  it('returns a plain settings object unchanged', () => {
    const settings = { theme: 'dark', mapsLink: 'x' };
    expect(getClinicSettings(settings)).toBe(settings);
  });

  it.each([null, undefined, 'str', 42, [1, 2, 3]])(
    'returns an empty object for the non-record value %p',
    (value) => {
      expect(getClinicSettings(value)).toEqual({});
    },
  );
});
