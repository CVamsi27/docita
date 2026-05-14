import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
  SubscriptionPrice,
  DiscountAggregate,
} from '@/domains/subscriptions/core/value-objects';

/** Persistent shape for a scheduled plan change (downgrade or cycle swap). */
export interface ScheduledPlanChange {
  plan: string;
  billingCycle: string;
  effectiveAt: string; // ISO-8601
}

export interface SubscriptionProps {
  id: string;
  clinicId: string;
  plan: ClinicTier;
  billingCycle: BillingCycle;
  basePriceCents: number;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelAtPeriodEnd?: boolean;
  razorpaySubscriptionId?: string;
  autoPayEnabled: boolean;
  discounts?: DiscountAggregate;
  creditsCents?: number;
  graceUntil?: Date | null;
  scheduledChange?: ScheduledPlanChange | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Subscription {
  readonly id: string;
  readonly clinicId: string;
  private plan: ClinicTier;
  private billingCycle: BillingCycle;
  private basePriceCents: number;
  private status: SubscriptionStatus;
  public currentPeriodStart: Date;
  public currentPeriodEnd: Date;
  public readonly trialEnd?: Date;
  public cancelledAt?: Date;
  public cancelAtPeriodEnd?: boolean;
  public razorpaySubscriptionId?: string;
  private autoPayEnabled: boolean;
  private discounts: DiscountAggregate;
  private creditsCents: number;
  private graceUntil: Date | null;
  public scheduledChange: ScheduledPlanChange | null;
  readonly createdAt: Date;
  public updatedAt: Date;
  public version: number;

  constructor(props: SubscriptionProps) {
    this.id = props.id;
    this.clinicId = props.clinicId;
    this.plan = props.plan;
    this.billingCycle = props.billingCycle;
    this.basePriceCents = props.basePriceCents;
    this.status = props.status;
    this.currentPeriodStart = props.currentPeriodStart;
    this.currentPeriodEnd = props.currentPeriodEnd;
    this.trialEnd = props.trialEnd;
    this.cancelledAt = props.cancelledAt;
    this.cancelAtPeriodEnd = props.cancelAtPeriodEnd;
    this.razorpaySubscriptionId = props.razorpaySubscriptionId;
    this.autoPayEnabled = props.autoPayEnabled;
    this.discounts = props.discounts || new DiscountAggregate();
    this.creditsCents = props.creditsCents || 0;
    this.graceUntil = props.graceUntil ?? null;
    this.scheduledChange = props.scheduledChange ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.version = props.version;

    this.validate();
  }

  private validate(): void {
    if (this.currentPeriodStart >= this.currentPeriodEnd) {
      throw new Error('Current period start must be before end');
    }
    if (this.basePriceCents < 0) {
      throw new Error('Base price cannot be negative');
    }
  }

  getPlan(): ClinicTier {
    return this.plan;
  }

  getBillingCycle(): BillingCycle {
    return this.billingCycle;
  }

  getStatus(): SubscriptionStatus {
    return this.status;
  }

  getBasePrice(): SubscriptionPrice {
    return new SubscriptionPrice(this.basePriceCents);
  }

  getDiscounts(): DiscountAggregate {
    return this.discounts;
  }

  getCredits(): SubscriptionPrice {
    return new SubscriptionPrice(this.creditsCents);
  }

  getGraceUntil(): Date | null {
    return this.graceUntil;
  }

  deductCreditsApplied(amountCents: number): void {
    const n = Math.round(amountCents);
    if (n <= 0) {
      return;
    }
    const applied = Math.min(this.creditsCents, n);
    this.creditsCents -= applied;
    this.updatedAt = new Date();
  }

  isAutoPayEnabled(): boolean {
    return this.autoPayEnabled;
  }

  getDaysRemaining(): number {
    const now = new Date();
    return Math.max(
      0,
      Math.ceil(
        (this.currentPeriodEnd.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }

  isDueForRenewal(): boolean {
    const now = new Date();
    return now >= this.currentPeriodEnd;
  }

  canRenew(): boolean {
    return !this.status.isTerminal();
  }

  canBeMidCycleChanged(): boolean {
    return this.status.isActive() || this.status.isTrialing();
  }

  upgradePlan(newTier: ClinicTier, newPricePaise: number, immediate: boolean) {
    if (!newTier.isUpgradeTo(this.plan)) {
      throw new Error('New tier must be an upgrade');
    }
    if (immediate) {
      this.plan = newTier;
      this.basePriceCents = newPricePaise;
      this.updatedAt = new Date();
    }
  }

  cancel(atPeriodEnd: boolean = true) {
    this.cancelAtPeriodEnd = atPeriodEnd;
    this.cancelledAt = new Date();
    if (!atPeriodEnd) {
      this.status = this.status.transitionTo(SubscriptionStatusEnum.CANCELLED);
    }
    this.updatedAt = new Date();
  }

  activate() {
    this.status = new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE);
    this.graceUntil = null;
    this.updatedAt = new Date();
  }

  expire() {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.EXPIRED);
    this.graceUntil = null;
    this.updatedAt = new Date();
  }

  enterGracePeriod(graceUntil: Date) {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.GRACE);
    this.graceUntil = graceUntil;
    this.updatedAt = new Date();
  }

  enterPastDue(graceUntil: Date) {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.PAST_DUE);
    this.graceUntil = graceUntil;
    this.updatedAt = new Date();
  }

  applyPayment() {
    const now = new Date();
    this.activatePaidPlan(
      this.plan,
      this.billingCycle,
      this.basePriceCents,
      now,
    );
  }

  activatePaidPlan(
    plan: ClinicTier,
    billingCycle: BillingCycle,
    basePriceCents: number,
    start: Date = new Date(),
    options: { preserveCurrentPeriodEnd?: boolean } = {},
  ) {
    const isSameCycle = this.billingCycle.equals(billingCycle);
    const keepExistingPeriodEnd =
      options.preserveCurrentPeriodEnd === true &&
      isSameCycle &&
      this.currentPeriodEnd > start;

    this.plan = plan;
    this.billingCycle = billingCycle;
    this.basePriceCents = basePriceCents;

    if (keepExistingPeriodEnd) {
      // Mid-cycle upgrade: keep the original renewal date so the user's
      // billing rhythm doesn't drift with every plan change.
      this.currentPeriodStart = start;
    } else {
      this.currentPeriodStart = start;
      const nextEnd = new Date(start);
      if (billingCycle.isYearly()) {
        nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      } else if (billingCycle.isSemiAnnual()) {
        nextEnd.setMonth(nextEnd.getMonth() + 6);
      } else if (billingCycle.isQuarterly()) {
        nextEnd.setMonth(nextEnd.getMonth() + 3);
      } else {
        nextEnd.setMonth(nextEnd.getMonth() + 1);
      }
      this.currentPeriodEnd = nextEnd;
    }

    this.status = new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE);
    this.graceUntil = null;
    this.updatedAt = new Date();
  }

  /**
   * Schedules a plan change to apply at a future date (typically the next
   * renewal). Used for downgrades so the user keeps current-tier features
   * for the remaining paid time.
   */
  schedulePlanChange(
    plan: ClinicTier,
    billingCycle: BillingCycle,
    effectiveAt: Date,
  ) {
    this.scheduledChange = {
      plan: plan.value,
      billingCycle: billingCycle.value,
      effectiveAt: effectiveAt.toISOString(),
    };
    this.updatedAt = new Date();
  }

  clearScheduledPlanChange() {
    this.scheduledChange = null;
    this.updatedAt = new Date();
  }

  /** Returns true if a scheduled change exists and its effectiveAt is in the past. */
  isScheduledChangeDue(now: Date = new Date()): boolean {
    if (!this.scheduledChange) return false;
    return (
      new Date(this.scheduledChange.effectiveAt).getTime() <= now.getTime()
    );
  }

  /** Adds a positive amount to the account credit balance. */
  addAccountCredit(amountCents: number) {
    if (amountCents <= 0) return;
    this.creditsCents += amountCents;
    this.updatedAt = new Date();
  }
}
