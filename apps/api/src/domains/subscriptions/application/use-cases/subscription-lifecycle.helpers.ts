import { NotFoundException } from '@nestjs/common';
import type { ISubscriptionRepository } from '@/domains/subscriptions/application/ports/subscription.repository.port';

/**
 * Loads a subscription by id or throws the standard "Subscription {id} not
 * found" `NotFoundException`. `EnterGracePeriodUseCase` and
 * `ExpireSubscriptionUseCase` both need this exact lookup-or-throw guard
 * before transitioning a subscription's lifecycle state — sharing it keeps
 * the message and guard from drifting between the two transitions.
 */
export async function loadSubscriptionByIdOrThrow(
  subscriptionRepo: ISubscriptionRepository,
  subscriptionId: string,
) {
  const subscription = await subscriptionRepo.findById(subscriptionId);
  if (!subscription) {
    throw new NotFoundException(`Subscription ${subscriptionId} not found`);
  }
  return subscription;
}
