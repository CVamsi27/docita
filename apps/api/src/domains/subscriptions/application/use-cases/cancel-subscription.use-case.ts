/**
 * Cancel Subscription Use Case
 * Handles subscription cancellation with optional end-of-period scheduling
 */

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscriptionValidationService } from '../../core/services';
import { CancelSubscriptionDto } from '../dto/subscription.dto';
import { ISubscriptionRepository, IPaymentGateway } from '../ports';

@Injectable()
export class CancelSubscriptionUseCase {
  constructor(
    private subscriptionRepository: ISubscriptionRepository,
    private validationService: SubscriptionValidationService,
    private paymentGateway: IPaymentGateway,
  ) {}

  async execute(dto: CancelSubscriptionDto): Promise<{ success: boolean }> {
    // Fetch subscription
    const subscription = await this.subscriptionRepository.findById(
      dto.subscriptionId,
    );

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${dto.subscriptionId} not found`,
      );
    }

    // Validate can cancel
    const canCancel = this.validationService.canCancelSubscription(subscription);
    if (!canCancel.allowed) {
      throw new BadRequestException(canCancel.reason);
    }

    if (dto.cancelAtEnd) {
      // Schedule cancellation for end of billing period
      // In practice, this would set a scheduled change or flag
      // For now, mark for cancellation at period end
      subscription.cancel(`Scheduled for end of period: ${dto.reason || 'User requested'}`);
    } else {
      // Cancel immediately
      subscription.cancel(dto.reason);
    }

    // Persist
    await this.subscriptionRepository.update(subscription);

    // TODO: Cancel on payment gateway if applicable
    // if (subscription.razorpaySubscriptionId) {
    //  await this.paymentGateway.cancelSubscription(subscription.razorpaySubscriptionId);
    // }

    return { success: true };
  }
}
