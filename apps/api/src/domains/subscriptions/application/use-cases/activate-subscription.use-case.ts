import {
  Injectable,
  Logger,
  NotFoundException as _NotFoundException,
  Inject,
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

export interface ActivateSubscriptionRequest {
  clinicId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: string;
  cycle: string;
}

@Injectable()
export class ActivateSubscriptionUseCase {
  private readonly logger = new Logger(ActivateSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
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
      subscription.applyPayment();
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
