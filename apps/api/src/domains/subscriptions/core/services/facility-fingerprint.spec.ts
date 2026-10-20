import { describe, expect, it } from '@jest/globals';
import { computeFacilityFingerprint } from './facility-fingerprint';

const base = {
  facilityName: 'Sunrise Diagnostics',
  address: '12 MG Road, Indiranagar',
  contactPhone: '+919812345678',
};

describe('computeFacilityFingerprint', () => {
  it('is deterministic for identical input', () => {
    expect(computeFacilityFingerprint(base)).toBe(
      computeFacilityFingerprint(base),
    );
  });

  it('ignores case, punctuation, and whitespace in name and address', () => {
    expect(
      computeFacilityFingerprint({
        facilityName: '  sunrise diagnostics, ',
        address: '12, mg road - indiranagar.',
        contactPhone: '+919812345678',
      }),
    ).toBe(computeFacilityFingerprint(base));
  });

  it('treats equivalent phone formats as the same facility (E.164 reuse)', () => {
    expect(
      computeFacilityFingerprint({ ...base, contactPhone: '98123 45678' }),
    ).toBe(computeFacilityFingerprint(base));
    expect(
      computeFacilityFingerprint({ ...base, contactPhone: '919812345678' }),
    ).toBe(computeFacilityFingerprint(base));
  });

  it('distinguishes different facilities sharing a contact phone', () => {
    expect(
      computeFacilityFingerprint({
        ...base,
        facilityName: 'Sunrise Diagnostics Two',
      }),
    ).not.toBe(computeFacilityFingerprint(base));
  });

  it('distinguishes different phones for the same facility', () => {
    expect(
      computeFacilityFingerprint({ ...base, contactPhone: '+919800000000' }),
    ).not.toBe(computeFacilityFingerprint(base));
  });

  it('returns null when no contact phone is provided', () => {
    expect(
      computeFacilityFingerprint({ ...base, contactPhone: null }),
    ).toBeNull();
    expect(
      computeFacilityFingerprint({ ...base, contactPhone: '' }),
    ).toBeNull();
  });
});
