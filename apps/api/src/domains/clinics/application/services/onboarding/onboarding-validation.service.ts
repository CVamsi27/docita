import { Injectable, BadRequestException } from '@nestjs/common';
import { Specialization } from '@workspace/db';
import {
  TIER_PRICING_BY_CURRENCY,
  type SupportedCurrency,
} from '@workspace/types';
import {
  CompleteOnboardingDto,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  validateSpecializationForOnboarding,
  validateClinicTier,
  validateBillingCycle,
} from './type-helpers';

@Injectable()
export class OnboardingValidationService {
  private resolveCurrency(currency?: string): SupportedCurrency {
    const resolved = currency?.toUpperCase() as SupportedCurrency | undefined;
    if (
      resolved &&
      Object.prototype.hasOwnProperty.call(TIER_PRICING_BY_CURRENCY, resolved)
    ) {
      return resolved;
    }
    return 'INR';
  }

  validateOnboardingCompletion(data: CompleteOnboardingDto): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!data.clinicDetails) {
      errors.push('Clinic details are required');
    }
    if (!data.adminAccount) {
      errors.push('Admin account details are required');
    }
    if (!data.planSelection) {
      errors.push('Plan selection is required');
    }
    if (!data.slaAgreement) {
      errors.push('SLA agreement is required');
    }
    if (!data.consentManagement) {
      errors.push('Consent management configuration is required');
    }

    if (data.slaAgreement) {
      if (!data.slaAgreement.acceptedSLA) {
        errors.push('SLA must be accepted to complete onboarding');
      }
      if (!data.slaAgreement.acceptedDataProcessingTerms) {
        errors.push('Data processing terms must be accepted');
      }
      if (!data.slaAgreement.acceptedPrivacyPolicy) {
        errors.push('Privacy policy must be accepted');
      }
    }

    if (data.planSelection && data.planSelection.tier !== ClinicTier.STARTER) {
      const currency = this.resolveCurrency(data.planSelection.currency);

      const hasProcessedPayment =
        !!data.paymentDetails?.razorpayPaymentId ||
        (!!data.paymentDetails?.cardLast4 &&
          data.paymentDetails?.skipPayment !== true);

      if (!hasProcessedPayment) {
        errors.push('Payment details are required for paid plans');
      }

      if (currency === 'INR' && !data.clinicDetails?.gstin) {
        errors.push(
          'GSTIN is required for paid Indian plans so we can issue GST invoices',
        );
      }
    }

    const wantsWhatsapp =
      !!data.paymentDetails?.addons?.whatsapp ||
      !!data.consentManagement?.enableWhatsAppCommunication;

    if (
      wantsWhatsapp &&
      !data.consentManagement?.whatsappBusinessNumber &&
      !data.paymentDetails?.whatsappBusinessNumber
    ) {
      errors.push(
        'WhatsApp business number is required when WhatsApp is enabled',
      );
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  validatePasswordStrength(password: string): {
    valid: boolean;
    error?: string;
  } {
    if (password.length < 8) {
      return {
        valid: false,
        error: 'Password must be at least 8 characters long',
      };
    }
    if (!/[A-Z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one uppercase letter',
      };
    }
    if (!/[a-z]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one lowercase letter',
      };
    }
    if (!/[0-9]/.test(password)) {
      return {
        valid: false,
        error: 'Password must contain at least one number',
      };
    }

    return { valid: true };
  }

  validateTier(tier: string): boolean {
    try {
      validateClinicTier(tier);
      return true;
    } catch {
      return false;
    }
  }

  validateBillingCycle(cycle: string): boolean {
    try {
      validateBillingCycle(cycle);
      return true;
    } catch {
      return false;
    }
  }

  validateSpecialization(
    spec: string | undefined,
  ): Specialization | null | undefined {
    try {
      if (!spec) return undefined;
      return validateSpecializationForOnboarding(spec);
    } catch {
      return spec as Specialization;
    }
  }

  validateSLAAcceptance(slaData: Record<string, unknown>): void {
    const data = slaData as Record<string, boolean>;
    if (!data.acceptedSLA) {
      throw new BadRequestException('SLA must be accepted to proceed');
    }
    if (!data.acceptedDataProcessingTerms) {
      throw new BadRequestException('Data processing terms must be accepted');
    }
    if (!data.acceptedPrivacyPolicy) {
      throw new BadRequestException('Privacy policy must be accepted');
    }
  }

  getTierPricing(tier: string, cycle: string, currency?: string): number {
    validateClinicTier(tier);
    validateBillingCycle(cycle);

    const resolvedCurrency = this.resolveCurrency(currency);
    const pricing = TIER_PRICING_BY_CURRENCY[resolvedCurrency];
    const tierPricing = pricing[tier as keyof typeof pricing];
    const amount = tierPricing?.[cycle as keyof typeof tierPricing];
    return typeof amount === 'number' ? amount : 0;
  }

  getTierLimits(tier: string): {
    includedPatients: number;
    includedAppointments: number;
    includedStorageGB: number;
    includedUsers: number;
  } {
    validateClinicTier(tier);

    const limits: Record<
      string,
      {
        includedPatients: number;
        includedAppointments: number;
        includedStorageGB: number;
        includedUsers: number;
      }
    > = {
      STARTER: {
        includedPatients: 50,
        includedAppointments: 100,
        includedStorageGB: 1,
        includedUsers: 1,
      },
      ESSENTIAL: {
        includedPatients: 500,
        includedAppointments: 1000,
        includedStorageGB: 10,
        includedUsers: 3,
      },
      PROFESSIONAL: {
        includedPatients: 10000,
        includedAppointments: 20000,
        includedStorageGB: 100,
        includedUsers: 15,
      },
      ENTERPRISE: {
        includedPatients: 999999,
        includedAppointments: 999999,
        includedStorageGB: 500,
        includedUsers: 50,
      },
    };

    return limits[tier] || limits.STARTER;
  }
}
