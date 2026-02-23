/**
 * Subscription Entity - Core aggregate
 * Represents a clinic's subscription with tier, billing cycle, and lifecycle
 * 
 * Responsibilities:
 * - Track subscription status and lifecycle
 * - Manage pricing and discounts
 * - Validate state transitions
 * - Calculate prorated amounts
 */

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
  readonly currentPeriodStart: Date;
  currentPeriodEnd: Date;
  readonly trialEnd?: Date;
  readonly cancelledAt?: Date;
  private autoPayEnabled: boolean;
  private discounts: DiscountAggregate;
  private creditsCents: number;
  readonly createdAt: Date;
  updatedAt: Date;
  readonly version: number;

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

    if (this.creditsCents < 0) {
      throw new Error('Credits cannot be negative');
    }
  }

  // ========================================================================
  // Getters
  // ========================================================================

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

  // ========================================================================
  // Pricing Calculations
  // ========================================================================

  /**
   * Get effective price after discounts
   */
  getEffectivePrice(): SubscriptionPrice {
    const totalDiscountPercent = this.discounts.getTotalPercent();
    return this.getBasePrice().applyDiscount(totalDiscountPercent);
  }

  /**
   * Get the discount amount
   */
  getDiscountAmount(): SubscriptionPrice {
    const totalDiscountPercent = this.discounts.getTotalPercent();
    return this.getBasePrice().getDiscountAmount(totalDiscountPercent);
  }

  /**
   * Calculate days remaining in current period
   */
  getDaysRemaining(): number {
    const today = new Date();
    if (today > this.currentPeriodEnd) {
      return 0;
    }
    const diffTime = this.currentPeriodEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Get total cycle days (30 or 365)
   */
  getCycleDays(): number {
    return this.billingCycle.getDays();
  }

  /**
   * Calculate proration for plan change
   */
  calculateProrationCredit(
    oldPriceCents: number,
    newPriceCents: number,
  ): SubscriptionPrice {
    const daysRemaining = this.getDaysRemaining();
    const cycleDays = this.getCycleDays();

    const oldPrice = new SubscriptionPrice(oldPriceCents);
    const creditPrice = oldPrice.prorate(daysRemaining, cycleDays);

    const newPrice = new SubscriptionPrice(newPriceCents);
    const chargePrice = newPrice.prorate(daysRemaining, cycleDays);

    // Credit for unused portion
    return creditPrice;
  }

  // ========================================================================
  // State Transitions
  // ========================================================================

  /**
   * Activate subscription
   */
  activate(): void {
    if (!this.status.canTransitionTo(SubscriptionStatusEnum.ACTIVE)) {
      throw new Error(
        `Cannot activate subscription from ${this.status.toString()} status`,
      );
    }
    this.status = this.status.transitionTo(SubscriptionStatusEnum.ACTIVE);
    this.updatedAt = new Date();
  }

  /**
   * Pause subscription
   */
  pause(): void {
    if (!this.status.canTransitionTo(SubscriptionStatusEnum.PAUSED)) {
      throw new Error(
        `Cannot pause subscription from ${this.status.toString()} status`,
      );
    }
    this.status = this.status.transitionTo(SubscriptionStatusEnum.PAUSED);
    this.updatedAt = new Date();
  }

  /**
   * Cancel subscription
   */
  cancel(reason?: string): void {
    if (!this.status.canTransitionTo(SubscriptionStatusEnum.CANCELLED)) {
      throw new Error(
        `Cannot cancel subscription from ${this.status.toString()} status`,
      );
    }
    this.status = this.status.transitionTo(SubscriptionStatusEnum.CANCELLED);
    (this as any).cancelledAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Mark as expired
   */
  expire(): void {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.EXPIRED);
    this.updatedAt = new Date();
  }

  // ========================================================================
  // Plan Changes
  // ========================================================================

  /**
   * Upgrade to new plan
   */
  upgradePlan(
    newPlan: ClinicTier,
    newPriceCents: number,
    immediate: boolean = true,
  ): void {
    if (!newPlan.isUpgradeTo(this.plan)) {
      throw new Error(
        `Cannot upgrade from ${this.plan.toString()} to ${newPlan.toString()}`,
      );
    }

    if (immediate) {
      this.plan = newPlan;
      this.basePriceCents = newPriceCents;
      this.updatedAt = new Date();
    }
  }

  /**
   * Downgrade to new plan
   */
  downgradePlan(
    newPlan: ClinicTier,
    newPriceCents: number,
    effectiveAt?: Date,
  ): void {
    if (!newPlan.isDowngradeTo(this.plan)) {
      throw new Error(
        `Cannot downgrade from ${this.plan.toString()} to ${newPlan.toString()}`,
      );
    }

    // Immediate downgrade (effective at next period is handled via scheduled change)
    this.plan = newPlan;
    this.basePriceCents = newPriceCents;
    this.updatedAt = new Date();
  }

  /**
   * Change billing cycle
   */
  changeBillingCycle(newCycle: BillingCycle): void {
    this.billingCycle = newCycle;
    this.updatedAt = new Date();
  }

  // ========================================================================
  // Discount Management
  // ========================================================================

  /**
   * Add discount to subscription
   */
  applyDiscount(discount: any): void {
    // Expects Discount instance
    this.updatedAt = new Date();
  }

  /**
   * Remove discount by type
   */
  removeDiscount(type: any): void {
    this.updatedAt = new Date();
  }

  // ========================================================================
  // Credit Management
  // ========================================================================

  /**
   * Add credits to subscription
   */
  addCredits(paise: number): void {
    if (paise < 0) {
      throw new Error('Credit amount cannot be negative');
    }
    this.creditsCents += paise;
    this.updatedAt = new Date();
  }

  /**
   * Deduct credits from subscription
   */
  deductCredits(paise: number): SubscriptionPrice {
    if (paise < 0) {
      throw new Error('Deduction amount cannot be negative');
    }
    const deducted = Math.min(paise, this.creditsCents);
    this.creditsCents -= deducted;
    this.updatedAt = new Date();
    return new SubscriptionPrice(deducted);
  }

  /**
   * Check if subscription can afford payment
   */
  canAfford(priceCents: number): boolean {
    const price = new SubscriptionPrice(priceCents);
    const credits = new SubscriptionPrice(this.creditsCents);
    return credits.isGreaterThan(price) || credits.equals(price);
  }

  // ========================================================================
  // Business Rules
  // ========================================================================

  /**
   * Check if subscription is due for renewal
   */
  isDueForRenewal(): boolean {
    const today = new Date();
    return today >= this.currentPeriodEnd;
  }

  /**
   * Check if subscription is in trial period
   */
  isInTrial(): boolean {
    if (!this.trialEnd) {
      return false;
    }
    return new Date() < this.trialEnd;
  }

  /**
   * Check if subscription is within grace period
   */
  isWithinGracePeriod(graceDays: number = 3): boolean {
    const lastDayOfGrace = new Date(this.currentPeriodEnd);
    lastDayOfGrace.setDate(lastDayOfGrace.getDate() + graceDays);
    return new Date() <= lastDayOfGrace;
  }

  /**
   * Can renew subscription (not in terminal state)
   */
  canRenew(): boolean {
    return !this.status.isTerminal();
  }

  /**
   * Can be changed mid-cycle
   */
  canBeMidCycleChanged(): boolean {
    return this.status.isActive() && this.getDaysRemaining() > 0;
  }
}
