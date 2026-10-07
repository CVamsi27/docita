import { TIER_LIMITS } from '@workspace/types';
import { deriveAnnualPrice } from '@workspace/utils';
import { describe, expect, it } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { completeOnboardingSchema } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { OnboardingValidationService } from './onboarding-validation.service';

describe('OnboardingValidationService', () => {
  const service = new OnboardingValidationService();
  const validCompletionInput = {
    clinicDetails: {
      name: 'Test Clinic',
      email: 'clinic@example.com',
      phone: '9876543210',
      address: '123 Test Street',
    },
    adminAccount: {
      name: 'Test Admin',
      email: 'admin@example.com',
      password: 'Password123',
      role: 'ADMIN',
    },
    planSelection: {
      tier: 'ESSENTIAL',
      billingCycle: 'MONTHLY',
    },
    paymentDetails: {
      razorpayPaymentId: 'pay_123',
      razorpayOrderId: 'order_123',
      razorpaySignature: 'signature_123',
    },
    slaAgreement: {
      acceptedSLA: true,
      slaVersion: '1.0',
      acceptedBy: 'Test Admin',
      signatureSessionId: 'signature-session-123',
      acceptedDataProcessingTerms: true,
      acceptedPrivacyPolicy: true,
    },
    consentManagement: {
      enableWhatsAppCommunication: false,
      enableMarketingCommunications: false,
      dataProcessingPurposes: ['TREATMENT'],
      patientConsentRequiredBeforeWhatsApp: true,
      logAllConsentChanges: true,
    },
  };

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

    it('rounds mode-adjusted catalog pricing before converting to paise', () => {
      expect(
        service.getTierPricing('ESSENTIAL', 'MONTHLY', 'INR', 'CORE'),
      ).toBe(799 * 100);
    });

    it('rejects discounted plan modes for Starter', () => {
      expect(() =>
        service.getTierPricing('STARTER', 'MONTHLY', 'INR', 'FRONT_DESK'),
      ).toThrow(BadRequestException);
    });
  });

  describe('getTierLimits', () => {
    it.each([
      'STARTER',
      'ESSENTIAL',
      'PROFESSIONAL',
      'HOSPITAL',
      'ENTERPRISE',
    ] as const)('returns canonical TIER_LIMITS quotas for %s', (tier) => {
      const limits = TIER_LIMITS[tier];

      expect(service.getTierLimits(tier)).toEqual({
        includedPatients: limits.patients,
        includedAppointments: limits.appointments ?? 0,
        includedStorageGB: limits.storageGB,
        includedUsers: limits.users ?? 1,
      });
    });

    it('does not fall back to Starter quotas for HOSPITAL', () => {
      expect(service.getTierLimits('HOSPITAL')).not.toEqual(
        service.getTierLimits('STARTER'),
      );
    });
  });

  describe('validateOnboardingCompletion', () => {
    it('does not accept card metadata as payment proof', () => {
      const result = service.validateOnboardingCompletion(
        completeOnboardingSchema.parse({
          ...validCompletionInput,
          paymentDetails: { cardLast4: '4242' },
        }),
      );

      expect(result).toEqual({
        valid: false,
        errors: expect.arrayContaining([
          'Payment details are required for paid plans',
        ]),
      });
    });

    it('applies front-desk role rules to the plan mode', () => {
      const result = service.validateOnboardingCompletion(
        completeOnboardingSchema.parse({
          ...validCompletionInput,
          adminAccount: {
            ...validCompletionInput.adminAccount,
            role: 'ADMIN_DOCTOR',
          },
          planSelection: {
            ...validCompletionInput.planSelection,
            planMode: 'FRONT_DESK',
          },
        }),
      );

      expect(result).toEqual({
        valid: false,
        errors: expect.arrayContaining([
          'The front desk plan does not support the admin-doctor role for the primary admin account.',
        ]),
      });
    });
  });
});
