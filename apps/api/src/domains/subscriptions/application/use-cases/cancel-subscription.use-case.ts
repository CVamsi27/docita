import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ISubscriptionRepository } from '../ports/subscription.repository.port';
import { IClinicOperations } from '../ports/clinic-operations.port';
import { IPaymentGateway } from '../ports/payment-gateway.port';
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
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly clinicOps: IClinicOperations,
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
