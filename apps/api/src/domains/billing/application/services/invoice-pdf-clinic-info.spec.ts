import { buildPdfClinicInfo } from './invoice-pdf-clinic-info';
import type { TaxRegistrationSnapshot } from '@workspace/types';

describe('buildPdfClinicInfo', () => {
  it('maps all clinic fields correctly', () => {
    const clinic = {
      name: 'Sunrise Clinic',
      address: '123 Main St',
      phone: '9876543210',
      email: 'info@sunrise.com',
      logo: 'https://example.com/logo.png',
      currency: 'INR',
      branding: null,
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.name).toBe('Sunrise Clinic');
    expect(result.address).toBe('123 Main St');
    expect(result.phone).toBe('9876543210');
    expect(result.email).toBe('info@sunrise.com');
    expect(result.logo).toBe('https://example.com/logo.png');
    expect(result.currency).toBe('INR');
  });

  it('uses sellerTaxSnapshot.registrationId as gstin when provided', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
    };
    const taxSnapshot = {
      countryCode: 'IN',
      regime: 'IN_GST' as const,
      registrationId: '27AABCU9603R1ZM',
    } satisfies TaxRegistrationSnapshot;
    const result = buildPdfClinicInfo(clinic, taxSnapshot);
    expect(result.gstin).toBe('27AABCU9603R1ZM');
  });

  it('falls back to extractClinicGstin when no tax snapshot', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
      settings: { gstin: '27FALLBACK1234Z' },
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.gstin).toBe('27FALLBACK1234Z');
  });

  it('converts null optional fields to undefined', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.address).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.logo).toBeUndefined();
    expect(result.currency).toBeUndefined();
    expect(result.gstin).toBeUndefined();
  });

  it('returns undefined gstin when no tax snapshot and no clinic settings', () => {
    const clinic = {
      name: 'Clinic',
      address: null,
      phone: null,
      email: null,
      logo: null,
      currency: null,
      branding: null,
    };
    const result = buildPdfClinicInfo(clinic, undefined);
    expect(result.gstin).toBeUndefined();
  });
});
