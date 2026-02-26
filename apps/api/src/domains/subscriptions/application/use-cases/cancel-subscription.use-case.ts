import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY_TOKEN,
} from '../ports/subscription.repository.port';
import {
  IClinicOperations,
  CLINIC_OPERATIONS_TOKEN,
} from '../ports/clinic-operations.port';
import {
  IPaymentGateway,
  PAYMENT_GATEWAY_TOKEN,
} from '../ports/payment-gateway.port';
import { SubscriptionStatusEnum } from '../../core/value-objects';

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
        'CAPTURE',
        SubscriptionStatusEnum.CANCELLED,
        {},
      );

      await this.clinicOps.emitUpdate(request.clinicId, {
        clinicId: request.clinicId,
        tier: 'CAPTURE',
        subscriptionStatus: SubscriptionStatusEnum.CANCELLED,
      });
    }

    this.logger.log(
      `Subscription cancelled for clinic ${request.clinicId}, at_period_end: ${cancelAtPeriodEnd}`,
    );
  }
}
