import { deriveAnnualPrice } from '@workspace/types';
import { describe, expect, it } from '@jest/globals';
import { OnboardingValidationService } from './onboarding-validation.service';

describe('OnboardingValidationService', () => {
  const service = new OnboardingValidationService();

  describe('getTierPricing', () => {
    it('returns catalog price in smallest currency units for MONTHLY', () => {
      expect(service.getTierPricing('ESSENTIAL', 'MONTHLY', 'INR')).toBe(
        999 * 100,
      );
    });

    it('returns catalog price in smallest currency units for YEARLY', () => {
      expect(service.getTierPricing('ESSENTIAL', 'YEARLY', 'INR')).toBe(
        deriveAnnualPrice(999) * 100,
      );
    });

    it('returns 0 for INTELLIGENCE tier (catalog zero)', () => {
      expect(service.getTierPricing('INTELLIGENCE', 'MONTHLY', 'INR')).toBe(0);
    });
  });
});
