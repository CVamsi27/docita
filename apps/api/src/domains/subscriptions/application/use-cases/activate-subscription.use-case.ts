import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import { SubscriptionPricingService } from '@/domains/subscriptions/core/services/subscription-pricing.service';
import {
  ClinicTier,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import { FeatureFlagService } from '@/shared/modules/services/feature-flag.service';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';

export interface ActivateSubscriptionRequest {
  clinicId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: string;
  cycle: string;
  skipPaymentVerification?: boolean;
  verifiedAmountCents?: number;
}

type SubscriptionPaymentRecord = {
  id: string;
  clinicId: string;
  amountCents: number;
  currency: string;
  status: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
};

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
    private readonly pricingService: SubscriptionPricingService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async execute(request: ActivateSubscriptionRequest): Promise<void> {
    const tier = ClinicTier.fromString(request.tier);
    const cycle = BillingCycle.fromString(request.cycle);
    const clinicOffer = await this.featureFlagService.getClinicPricingOffer(
      request.clinicId,
    );
    const offerPercent = clinicOffer?.percentOff ?? 0;

    let subscription = await this.subscriptionRepo.findByClinicId(
      request.clinicId,
    );
    const priceCents = this.pricingService.calculatePrice(
      tier,
      cycle,
      offerPercent,
    );
    const payment = (await this.subscriptionRepo.findPaymentByOrderId(
      request.clinicId,
      request.razorpayOrderId,
    )) as SubscriptionPaymentRecord | null;

    if (!payment) {
      throw new BadRequestException('Payment order not found for this clinic');
    }

    if (payment.amountCents !== priceCents) {
      throw new BadRequestException(
        'Payment amount does not match selected plan',
      );
    }

    let verifiedAmountCents = request.verifiedAmountCents;
    if (!request.skipPaymentVerification) {
      const verification = await this.paymentGateway.verifyPayment({
        razorpayOrderId: request.razorpayOrderId,
        razorpayPaymentId: request.razorpayPaymentId,
        razorpaySignature: request.razorpaySignature,
      });

      if (!verification.verified) {
        throw new BadRequestException('Unable to verify payment');
      }

      if (
        verification.orderId &&
        verification.orderId !== request.razorpayOrderId
      ) {
        throw new BadRequestException('Payment order verification failed');
      }

      verifiedAmountCents = verification.amountCents;
    }

    if (
      verifiedAmountCents !== undefined &&
      verifiedAmountCents !== payment.amountCents
    ) {
      throw new BadRequestException(
        'Payment amount does not match selected plan',
      );
    }

    if (!subscription) {
      subscription = new Subscription({
        id: crypto.randomUUID(),
        clinicId: request.clinicId,
        plan: tier,
        billingCycle: cycle,
        basePriceCents: priceCents,
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(new Date(), cycle),
        autoPayEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });
    } else {
      subscription.activatePaidPlan(tier, cycle, priceCents);
    }

    await this.subscriptionRepo.save(subscription);

    await this.subscriptionRepo.updatePaymentStatus(
      request.razorpayOrderId,
      'paid',
      {
        paymentId: request.razorpayPaymentId,
        signature: request.razorpaySignature,
        subscriptionId: subscription.id,
      },
    );

    const featureUpdates: Record<string, boolean> = {};
    if (!tier.isStarter()) {
      featureUpdates['WHATSAPP'] = true;
      featureUpdates['PAYMENT_LINKS'] = true;
      featureUpdates['WHATSAPP_REMINDERS'] = true;
    }

    await this.clinicOps.updateTierAndFeatures(
      request.clinicId,
      tier.value,
      SubscriptionStatusEnum.ACTIVE,
      featureUpdates,
    );

    await this.clinicOps.emitUpdate(request.clinicId, {
      clinicId: request.clinicId,
      tier: tier.value,
      subscriptionStatus: SubscriptionStatusEnum.ACTIVE,
    });

    this.logger.log(
      `Subscription activated for clinic ${request.clinicId}: ${tier.value} ${cycle.value}`,
    );
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    if (cycle.isYearly()) {
      end.setFullYear(end.getFullYear() + 1);
    } else if (cycle.isSemiAnnual()) {
      end.setMonth(end.getMonth() + 6);
    } else if (cycle.isQuarterly()) {
      end.setMonth(end.getMonth() + 3);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }
}
