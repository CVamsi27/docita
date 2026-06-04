import { BadRequestException } from '@nestjs/common';
import type { CompleteOnboardingDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { isTrialEligibleTier } from './onboarding-trial-eligibility';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import type { IPaymentGateway } from '@/domains/subscriptions/application/ports';
import { hasPriorSubscriptionForEmail } from './onboarding-helpers';

export class OnboardingPaymentValidator {
  constructor(
    private persistence: ClinicPersistencePort,
    private paymentGateway: IPaymentGateway,
    private validationService: {
      getTierPricing: (
        tier: string,
        billingCycle: string,
        currency?: string,
        planMode?: string,
      ) => number;
    },
  ) {}

  async validatePayment(completeData: CompleteOnboardingDto): Promise<void> {
    const listPriceCents = this.validationService.getTierPricing(
      completeData.planSelection.tier,
      completeData.planSelection.billingCycle,
      completeData.planSelection.currency,
      completeData.planSelection.planMode,
    );
    const isUnpaidTrial =
      isTrialEligibleTier(completeData.planSelection.tier) &&
      completeData.paymentDetails?.skipPayment === true;

    await this.ensureFreeTrialIsAvailable(completeData, isUnpaidTrial);
    await this.verifyPaidPlanPayment(
      completeData,
      listPriceCents,
      isUnpaidTrial,
    );
  }

  private async ensureFreeTrialIsAvailable(
    completeData: CompleteOnboardingDto,
    isUnpaidTrial: boolean,
  ): Promise<void> {
    if (!isUnpaidTrial) return;

    const hasPriorSubscription = await hasPriorSubscriptionForEmail(
      this.persistence,
      completeData.adminAccount.email,
    );
    if (hasPriorSubscription) {
      throw new BadRequestException(
        'The 30-day free trial is only available to new customers. Please choose a paid plan to continue.',
      );
    }
  }

  private async verifyPaidPlanPayment(
    completeData: CompleteOnboardingDto,
    listPriceCents: number,
    isUnpaidTrial: boolean,
  ): Promise<void> {
    if (listPriceCents <= 0 || isUnpaidTrial) return;

    const payment = this.getVerifiedRazorpayPaymentInput(completeData);
    const verification = await this.paymentGateway.verifyPayment(payment);

    if (!verification.verified) {
      throw new BadRequestException('Unable to verify payment');
    }

    if (verification.amountCents !== listPriceCents) {
      throw new BadRequestException(
        'Payment amount does not match selected plan',
      );
    }
  }

  private getVerifiedRazorpayPaymentInput(completeData: CompleteOnboardingDto) {
    const paymentDetails = completeData.paymentDetails;
    const razorpayPaymentId = paymentDetails?.razorpayPaymentId;
    const razorpayOrderId = paymentDetails?.razorpayOrderId;
    const razorpaySignature = paymentDetails?.razorpaySignature;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new BadRequestException('Payment details are required');
    }

    return {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    };
  }
}
