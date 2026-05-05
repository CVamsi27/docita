export enum SubscriptionStatusEnum {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  GRACE = 'GRACE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

const VALID_TRANSITIONS: Record<
  SubscriptionStatusEnum,
  SubscriptionStatusEnum[]
> = {
  [SubscriptionStatusEnum.TRIALING]: [
    SubscriptionStatusEnum.ACTIVE,
    SubscriptionStatusEnum.PAST_DUE,
    SubscriptionStatusEnum.GRACE,
    SubscriptionStatusEnum.CANCELLED,
    SubscriptionStatusEnum.EXPIRED,
  ],
  [SubscriptionStatusEnum.ACTIVE]: [
    SubscriptionStatusEnum.PAST_DUE,
    SubscriptionStatusEnum.GRACE,
    SubscriptionStatusEnum.PAUSED,
    SubscriptionStatusEnum.CANCELLED,
    SubscriptionStatusEnum.EXPIRED,
  ],
  [SubscriptionStatusEnum.PAST_DUE]: [
    SubscriptionStatusEnum.ACTIVE,
    SubscriptionStatusEnum.GRACE,
    SubscriptionStatusEnum.CANCELLED,
    SubscriptionStatusEnum.EXPIRED,
  ],
  [SubscriptionStatusEnum.GRACE]: [
    SubscriptionStatusEnum.ACTIVE,
    SubscriptionStatusEnum.CANCELLED,
    SubscriptionStatusEnum.EXPIRED,
  ],
  [SubscriptionStatusEnum.PAUSED]: [
    SubscriptionStatusEnum.ACTIVE,
    SubscriptionStatusEnum.CANCELLED,
  ],
  [SubscriptionStatusEnum.CANCELLED]: [SubscriptionStatusEnum.ACTIVE],
  [SubscriptionStatusEnum.EXPIRED]: [SubscriptionStatusEnum.ACTIVE],
};

export class SubscriptionStatus {
  constructor(readonly value: SubscriptionStatusEnum) {}

  static fromString(value: string): SubscriptionStatus {
    const statusValue = value.toUpperCase() as SubscriptionStatusEnum;
    if (!Object.values(SubscriptionStatusEnum).includes(statusValue)) {
      throw new Error(`Invalid subscription status: ${value}`);
    }
    return new SubscriptionStatus(statusValue);
  }

  isActive(): boolean {
    return this.value === SubscriptionStatusEnum.ACTIVE;
  }

  isTrialing(): boolean {
    return this.value === SubscriptionStatusEnum.TRIALING;
  }

  isGrace(): boolean {
    return this.value === SubscriptionStatusEnum.GRACE;
  }

  isPastDue(): boolean {
    return this.value === SubscriptionStatusEnum.PAST_DUE;
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
      throw new Error(`Cannot transition from ${this.value} to ${newStatus}`);
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
