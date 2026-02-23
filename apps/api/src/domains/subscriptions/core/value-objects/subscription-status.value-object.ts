/**
 * Subscription Status Value Object
 * Implements state machine for subscription lifecycle
 * 
 * Valid transitions:
 * ACTIVE → PAUSED, CANCELLED, EXPIRED
 * PAUSED → ACTIVE, CANCELLED
 * CANCELLED → (terminal state)
 * EXPIRED → (terminal state)
 */

export enum SubscriptionStatusEnum {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

const VALID_TRANSITIONS: Record<SubscriptionStatusEnum, SubscriptionStatusEnum[]> = {
  [SubscriptionStatusEnum.ACTIVE]: [
    SubscriptionStatusEnum.PAUSED,
    SubscriptionStatusEnum.CANCELLED,
    SubscriptionStatusEnum.EXPIRED,
  ],
  [SubscriptionStatusEnum.PAUSED]: [
    SubscriptionStatusEnum.ACTIVE,
    SubscriptionStatusEnum.CANCELLED,
  ],
  [SubscriptionStatusEnum.CANCELLED]: [],
  [SubscriptionStatusEnum.EXPIRED]: [],
};

export class SubscriptionStatus {
  constructor(readonly value: SubscriptionStatusEnum) {}

  isActive(): boolean {
    return this.value === SubscriptionStatusEnum.ACTIVE;
  }

  isPaused(): boolean {
    return this.value === SubscriptionStatusEnum.PAUSED;
  }

  isCancelled(): boolean {
    return this.value === SubscriptionStatusEnum.CANCELLED;
  }

  isExpired(): boolean {
    return this.value === SubscriptionStatusEnum.EXPIRED;
  }

  isTerminal(): boolean {
    return this.isCancelled() || this.isExpired();
  }

  canTransitionTo(newStatus: SubscriptionStatusEnum): boolean {
    return VALID_TRANSITIONS[this.value].includes(newStatus);
  }

  transitionTo(newStatus: SubscriptionStatusEnum): SubscriptionStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.value} to ${newStatus}`,
      );
    }
    return new SubscriptionStatus(newStatus);
  }

  equals(other: SubscriptionStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
