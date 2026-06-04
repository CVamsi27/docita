import { Injectable, BadRequestException } from '@nestjs/common';
import { Role, Specialization } from '@workspace/db';
import {
  isFrontDeskPlanMode,
  mapDbClinicTierStringToTierName,
  PLAN_MODE_INFO,
  planModeSchema,
  resolveClinicPlanMode,
  TIER_PRICING_BY_CURRENCY,
  tierSupportsMode,
  tierSchema,
  type MultiCurrencyTierPricing,
  type PlanMode,
  type SupportedCurrency,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';
import { z } from 'zod';
import { CompleteOnboardingDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import {
  validateSpecializationForOnboarding,
  validateClinicTier,
  validateBillingCycle,
} from './onboarding-type-validation';
import { isTrialEligibleTier } from './onboarding-trial-eligibility';

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

  private resolvePlanMode(tier: string, planMode?: string): PlanMode {
    const parsedMode = planModeSchema.safeParse(planMode ?? 'FULL');
    if (!parsedMode.success) {
      throw new BadRequestException('Invalid plan mode');
    }

    const tierName = mapDbClinicTierStringToTierName(tier);
    if (!tierSupportsMode(tierName, parsedMode.data)) {
      throw new BadRequestException(
        `${tierName} is only available in Full plan mode`,
      );
    }

    return resolveClinicPlanMode(tier, parsedMode.data);
  }

  validateOnboardingCompletion(data: CompleteOnboardingDto): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];
    const onboardingData = data ?? ({} as CompleteOnboardingDto);

    this.addRequiredSectionErrors(onboardingData, errors);
    this.addSlaAgreementErrors(onboardingData, errors);
    this.addPlanSelectionErrors(onboardingData, errors);
    this.addWhatsappConfigurationErrors(onboardingData, errors);
    this.addFrontDeskRoleErrors(onboardingData, errors);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true };
  }

  private addRequiredSectionErrors(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    if (!data.clinicDetails) errors.push('Clinic details are required');
    if (!data.adminAccount) errors.push('Admin account details are required');
    if (!data.planSelection) errors.push('Plan selection is required');
    if (!data.slaAgreement) errors.push('SLA agreement is required');
    if (!data.consentManagement) {
      errors.push('Consent management configuration is required');
    }
  }

  private addSlaAgreementErrors(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    if (!data.slaAgreement) return;

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

  private addPlanSelectionErrors(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    if (!data.planSelection) return;

    this.addPlanModeError(data, errors);

    if (!this.isUnpaidTrial(data) && !this.hasProcessedPayment(data)) {
      errors.push('Payment details are required for paid plans');
    }

    // GSTIN is optional at onboarding; clinics add it later in
    // Settings → Billing before the first paid GST invoice is issued.
  }

  private addPlanModeError(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    try {
      this.resolvePlanMode(
        data.planSelection.tier,
        data.planSelection.planMode,
      );
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid plan mode');
    }
  }

  private hasProcessedPayment(data: CompleteOnboardingDto): boolean {
    return (
      !!data.paymentDetails?.razorpayPaymentId &&
      !!data.paymentDetails?.razorpayOrderId &&
      !!data.paymentDetails?.razorpaySignature
    );
  }

  private isUnpaidTrial(data: CompleteOnboardingDto): boolean {
    return (
      isTrialEligibleTier(data.planSelection.tier) &&
      data.paymentDetails?.skipPayment === true
    );
  }

  private addWhatsappConfigurationErrors(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    const wantsWhatsapp =
      !!data.paymentDetails?.addons?.whatsapp ||
      !!data.consentManagement?.enableWhatsAppCommunication;
    const hasWhatsappNumber =
      !!data.consentManagement?.whatsappBusinessNumber ||
      !!data.paymentDetails?.whatsappBusinessNumber;

    if (wantsWhatsapp && !hasWhatsappNumber) {
      errors.push(
        'WhatsApp business number is required when WhatsApp is enabled',
      );
    }
  }

  private addFrontDeskRoleErrors(
    data: CompleteOnboardingDto,
    errors: string[],
  ): void {
    if (!this.isFrontDeskPlan(data)) return;

    if (data.staffSetup?.staffMembers?.some((member) => this.isUnsupportedFrontDeskStaffRole(member.role))) {
      errors.push(
        'The Front Desk plan does not support nurse or admin-doctor staff roles during onboarding.',
      );
    }

    if (data.adminAccount?.role === Role.ADMIN_DOCTOR) {
      errors.push(
        'The front desk plan does not support the admin-doctor role for the primary admin account.',
      );
    }
  }

  private isFrontDeskPlan(data: CompleteOnboardingDto): boolean {
    return data.planSelection
      ? isFrontDeskPlanMode(
          data.planSelection.tier,
          data.planSelection.planMode,
        )
      : false;
  }

  private isUnsupportedFrontDeskStaffRole(role: Role): boolean {
    return role === Role.NURSE || role === Role.ADMIN_DOCTOR;
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

  getTierPricing(
    tier: string,
    cycle: string,
    currency?: string,
    planMode?: string,
  ): number {
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
    // Front Desk / Core plans bill at a fraction of the Full-mode price; keep
    // checkout, the verified payment amount, and basePriceCents consistent.
    const resolvedMode = this.resolvePlanMode(tier, planMode);
    const multiplier = PLAN_MODE_INFO[resolvedMode].pricingMultiplier;
    // Catalog amounts are in major units (e.g. INR rupees). Match the shared
    // UI pricing helper by rounding the adjusted catalog amount before
    // converting it to Razorpay / Subscription smallest units (paise).
    return Math.round(amount * multiplier) * 100;
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
      FRONT_DESK_CLINIC: {
        includedPatients: 999999,
        includedAppointments: 3000,
        includedStorageGB: 50,
        includedUsers: 25,
      },
      FRONT_DESK_HOSPITAL: {
        includedPatients: 999999,
        includedAppointments: 15000,
        includedStorageGB: 250,
        includedUsers: 150,
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
