import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
  SubscriptionPrice,
  DiscountAggregate,
} from '../value-objects';

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
    this.updatedAt = new Date();
  }

  expire() {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.EXPIRED);
    this.updatedAt = new Date();
  }

  enterGracePeriod() {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.GRACE);
    this.updatedAt = new Date();
  }

  applyPayment() {
    const now = new Date();
    this.currentPeriodStart = now;
    const nextEnd = new Date(now);
    if (this.billingCycle.isYearly()) {
      nextEnd.setFullYear(nextEnd.getFullYear() + 1);
    } else if (this.billingCycle.isSemiAnnual()) {
      nextEnd.setMonth(nextEnd.getMonth() + 6);
    } else if (this.billingCycle.isQuarterly()) {
      nextEnd.setMonth(nextEnd.getMonth() + 3);
    } else {
      nextEnd.setMonth(nextEnd.getMonth() + 1);
    }
    this.currentPeriodEnd = nextEnd;
    this.status = new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE);
    this.updatedAt = new Date();
  }
}
