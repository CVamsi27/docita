import { Injectable, BadRequestException } from '@nestjs/common';
import { Specialization } from '@workspace/db';
import {
  TIER_PRICING_BY_CURRENCY,
  tierSchema,
  type MultiCurrencyTierPricing,
  type SupportedCurrency,
  isFrontDeskWorkspace,
  parseWorkspaceProfile,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { z } from 'zod';
import {
  CompleteOnboardingDto,
  ClinicTier,
} from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  validateSpecializationForOnboarding,
  validateClinicTier,
  validateBillingCycle,
} from './type-helpers';

function billingCycleEnumToCatalogKey(
  cycle: string,
): keyof MultiCurrencyTierPricing | null {
  switch (cycle.toUpperCase()) {
    case 'MONTHLY':
      return 'monthly';
    case 'YEARLY':
      return 'yearly';
    case 'QUARTERLY':
    case 'SEMI_ANNUAL':
      return 'monthly';
    default:
      return null;
  }
}

const SUPPORTED_CURRENCY_MEMBERS = Object.keys(TIER_PRICING_BY_CURRENCY).filter(
  (key): key is SupportedCurrency => key in TIER_PRICING_BY_CURRENCY,
);

const slaAcceptanceSchema = z.object({
  acceptedSLA: z.boolean(),
  acceptedDataProcessingTerms: z.boolean(),
  acceptedPrivacyPolicy: z.boolean(),
});

@Injectable()
export class OnboardingValidationService {
  private resolveCurrency(currency?: string): SupportedCurrency {
    const upper = currency?.toUpperCase();
    if (upper) {
      const parsed = parseStringEnumMember(SUPPORTED_CURRENCY_MEMBERS, upper);
      if (parsed) {
        return parsed;
      }
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

    if (data.planSelection) {
      const currency = this.resolveCurrency(data.planSelection.currency);
      const listPricePaise = this.getTierPricing(
        data.planSelection.tier,
        data.planSelection.billingCycle,
        data.planSelection.currency,
      );
      const hasProcessedPayment =
        !!data.paymentDetails?.razorpayPaymentId ||
        (!!data.paymentDetails?.cardLast4 &&
          data.paymentDetails?.skipPayment !== true);

      const unpaidEssentialTrial =
        data.planSelection.tier === ClinicTier.ESSENTIAL &&
        data.paymentDetails?.skipPayment === true;

      if (!unpaidEssentialTrial && !hasProcessedPayment) {
        errors.push('Payment details are required for paid plans');
      }

      if (
        currency === 'INR' &&
        !data.clinicDetails?.gstin &&
        listPricePaise > 0 &&
        !unpaidEssentialTrial
      ) {
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

    const workspaceProfile = parseWorkspaceProfile(
      data.planSelection?.workspaceProfile,
    );
    const isFrontDeskTier = data.planSelection?.tier === ClinicTier.FRONT_DESK;
    const isFrontDeskWorkspaceMode = isFrontDeskWorkspace(workspaceProfile);
    if (
      (isFrontDeskTier || isFrontDeskWorkspaceMode) &&
      data.staffSetup?.staffMembers
    ) {
      let doctorLikeCount = 0;
      for (const member of data.staffSetup.staffMembers) {
        if (member.role === 'NURSE' || member.role === 'ADMIN_DOCTOR') {
          errors.push(
            'The front desk workspace does not support nurse or admin-doctor staff roles during onboarding.',
          );
          break;
        }
        if (member.role === 'DOCTOR') {
          doctorLikeCount += 1;
        }
      }
      if (!isFrontDeskTier && doctorLikeCount > 1) {
        errors.push(
          'The front desk workspace allows at most one doctor profile during onboarding.',
        );
      }
    }

    if (
      data.planSelection?.tier === ClinicTier.FRONT_DESK &&
      data.adminAccount?.role === 'ADMIN_DOCTOR'
    ) {
      errors.push(
        'The front desk plan does not support the admin-doctor role for the primary admin account.',
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

  validateSpecialization(spec: string | undefined): Specialization | null {
    if (!spec) return null;
    return validateSpecializationForOnboarding(spec);
  }

  validateSLAAcceptance(slaData: Record<string, unknown>): void {
    const data = slaAcceptanceSchema.parse(slaData);
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
    const parsedTier = tierSchema.safeParse(tier);
    const tierKey = parsedTier.success ? parsedTier.data : 'ESSENTIAL';
    const tierPricing = pricing[tierKey];
    const pricingKey = billingCycleEnumToCatalogKey(cycle);
    const amount = pricingKey !== null ? tierPricing?.[pricingKey] : undefined;
    if (typeof amount !== 'number') {
      return 0;
    }
    // Catalog amounts are in major units (e.g. INR rupees); Razorpay and
    // Subscription.basePriceCents store smallest currency units (paise).
    return Math.round(amount * 100);
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
      FRONT_DESK: {
        includedPatients: 999999,
        includedAppointments: 500,
        includedStorageGB: 10,
        includedUsers: 5,
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
