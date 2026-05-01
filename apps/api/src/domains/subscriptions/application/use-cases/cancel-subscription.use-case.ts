import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '@/domains/subscriptions/application/ports/clinic-operations.port';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '@/domains/subscriptions/application/ports/payment-gateway.port';
import { SubscriptionStatusEnum } from '@/domains/subscriptions/core/value-objects';

export interface CancelSubscriptionRequest {
  clinicId: string;
  cancelAtPeriodEnd?: boolean;
  reason?: string;
}

@Injectable()
export class CancelSubscriptionUseCase {
  private readonly logger = new Logger(CancelSubscriptionUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(CLINIC_OPERATIONS_TOKEN)
    private readonly clinicOps: IClinicOperations,
    @Inject(PAYMENT_GATEWAY_TOKEN)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(request: CancelSubscriptionRequest): Promise<void> {
    const cancelAtPeriodEnd = request.cancelAtPeriodEnd ?? true;
    const subscription = await this.subscriptionRepo.findByClinicId(
      request.clinicId,
    );

    if (!subscription) {
      throw new NotFoundException(
        `Subscription for clinic ${request.clinicId} not found`,
      );
    }

    if (subscription.razorpaySubscriptionId) {
      await this.paymentGateway.cancelSubscription(
        subscription.razorpaySubscriptionId,
      );
    }

    subscription.cancel(cancelAtPeriodEnd);
    await this.subscriptionRepo.save(subscription);

    if (!cancelAtPeriodEnd) {
      await this.clinicOps.updateTierAndFeatures(
        request.clinicId,
        'STARTER',
        SubscriptionStatusEnum.CANCELLED,
        {},
      );

      await this.clinicOps.emitUpdate(request.clinicId, {
        clinicId: request.clinicId,
        tier: 'STARTER',
        subscriptionStatus: SubscriptionStatusEnum.CANCELLED,
        subscriptionGraceUntil: null,
      });
    }

    this.logger.log(
      `Subscription cancelled for clinic ${request.clinicId}, at_period_end: ${cancelAtPeriodEnd}`,
    );
  }
}
