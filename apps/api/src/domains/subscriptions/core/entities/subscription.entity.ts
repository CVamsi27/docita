import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
  ClinicTier,
  BillingCycle,
  SubscriptionPrice,
  DiscountAggregate,
} from '@/domains/subscriptions/core/value-objects';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

/** Persistent shape for a scheduled plan change (downgrade or cycle swap). */
export interface ScheduledPlanChange {
  plan: string;
  billingCycle: string;
  effectiveAt: string; // ISO-8601
  /** Optional PlanMode for the scheduled change. Undefined defaults to FULL on apply. */
  planMode?: string;
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
    // jscpd:ignore-start
    this.version = props.version;

    this.validate();
  }

  private touchUpdatedAt(now: Date): void {
    this.updatedAt = now;
  }

  private validate(): void {
    if (this.currentPeriodStart >= this.currentPeriodEnd)
      // jscpd:ignore-end
      throw new InvariantViolationError(
        'Current period start must be before end',
      );
    if (this.basePriceCents < 0)
      throw new InvariantViolationError('Base price cannot be negative');
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

  deductCreditsApplied(amountCents: number, now: Date): void {
    const n = Math.round(amountCents);
    if (n <= 0) {
      return;
    }
    const applied = Math.min(this.creditsCents, n);
    this.creditsCents -= applied;
    this.touchUpdatedAt(now);
  }

  isAutoPayEnabled(): boolean {
    return this.autoPayEnabled;
  }

  getDaysRemaining(now: Date): number {
    return Math.max(
      0,
      Math.ceil(
        (this.currentPeriodEnd.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }

  isDueForRenewal(now: Date): boolean {
    return now >= this.currentPeriodEnd;
  }

  canRenew(): boolean {
    return !this.status.isTerminal();
  }

  canBeMidCycleChanged(): boolean {
    return this.status.isActive() || this.status.isTrialing();
  }

  upgradePlan(
    newTier: ClinicTier,
    newPricePaise: number,
    immediate: boolean,
    now: Date,
  ) {
    if (!newTier.isUpgradeTo(this.plan)) {
      throw new InvariantViolationError('New tier must be an upgrade');
    }
    if (immediate) {
      this.plan = newTier;
      this.basePriceCents = newPricePaise;
      this.touchUpdatedAt(now);
    }
  }

  cancel(atPeriodEnd: boolean = true, now: Date) {
    this.cancelAtPeriodEnd = atPeriodEnd;
    this.cancelledAt = now;
    if (!atPeriodEnd) {
      this.status = this.status.transitionTo(SubscriptionStatusEnum.CANCELLED);
    }
    this.touchUpdatedAt(now);
  }

  activate(now: Date) {
    this.status = new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE);
    this.graceUntil = null;
    this.touchUpdatedAt(now);
  }

  /**
   * After a lapsed renewal, the new paid period starts the calendar day after the
   * previous period ended (not the payment completion date).
   */
  static resolvePaidPeriodStartAfterLapse(
    previousPeriodEnd: Date,
    paymentDate: Date,
  ): Date {
    const dayAfterLapse = new Date(previousPeriodEnd);
    dayAfterLapse.setUTCDate(dayAfterLapse.getUTCDate() + 1);
    dayAfterLapse.setUTCHours(0, 0, 0, 0);
    return paymentDate.getTime() >= dayAfterLapse.getTime()
      ? dayAfterLapse
      : paymentDate;
  }

  /** Billing period end from a cycle anchor (shared by paid activation paths). */
  static calculatePeriodEnd(start: Date, billingCycle: BillingCycle): Date {
    const end = new Date(start);
    if (billingCycle.isYearly()) {
      end.setFullYear(end.getFullYear() + 1);
    } else if (billingCycle.isSemiAnnual()) {
      end.setMonth(end.getMonth() + 6);
    } else if (billingCycle.isQuarterly()) {
      end.setMonth(end.getMonth() + 3);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    return end;
  }

  static createFromRazorpayActivation(params: {
    id: string;
    clinicId: string;
    plan: ClinicTier;
    billingCycle: BillingCycle;
    basePriceCents: number;
    periodStart: Date;
    periodEnd: Date;
    razorpaySubscriptionId: string;
    now: Date;
  }): Subscription {
    const timestamps = params.now;
    return new Subscription({
      id: params.id,
      clinicId: params.clinicId,
      plan: params.plan,
      billingCycle: params.billingCycle,
      basePriceCents: params.basePriceCents,
      status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
      currentPeriodStart: params.periodStart,
      currentPeriodEnd: params.periodEnd,
      razorpaySubscriptionId: params.razorpaySubscriptionId,
      autoPayEnabled: true,
      createdAt: timestamps,
      updatedAt: timestamps,
      version: 1,
    });
  }

  /** Razorpay `subscription.activated` on an existing clinic subscription. */
  applyRazorpayActivation(
    periodStart: Date,
    periodEnd: Date,
    razorpaySubscriptionId: string,
    now: Date,
  ): void {
    this.activate(now);
    this.currentPeriodStart = periodStart;
    this.currentPeriodEnd = periodEnd;
    this.razorpaySubscriptionId = razorpaySubscriptionId;
  }

  /** Razorpay `subscription.charged` renewal while keeping the subscription active. */
  applyRazorpayRenewal(periodEnd: Date, now: Date): void {
    this.activate(now);
    this.currentPeriodEnd = periodEnd;
  }

  /**
   * Mid-cycle tier change on the same billing cycle: keep the existing period end
   * so renewal dates do not drift.
   */
  shouldPreservePeriodEndOnTierChange(
    newPlan: ClinicTier,
    newCycle: BillingCycle,
  ): boolean {
    return (
      this.getBillingCycle().equals(newCycle) && !this.getPlan().equals(newPlan)
    );
  }

  expire(now: Date) {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.EXPIRED);
    this.graceUntil = null;
    this.touchUpdatedAt(now);
  }

  enterGracePeriod(graceUntil: Date, now: Date) {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.GRACE);
    this.graceUntil = graceUntil;
    this.touchUpdatedAt(now);
  }

  enterPastDue(graceUntil: Date, now: Date) {
    this.status = this.status.transitionTo(SubscriptionStatusEnum.PAST_DUE);
    this.graceUntil = graceUntil;
    this.touchUpdatedAt(now);
  }

  applyPayment(now: Date) {
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
    start: Date,
    options: { preserveCurrentPeriodEnd?: boolean } = {},
  ) {
    const isSameCycle = this.billingCycle.equals(billingCycle);
    const isSamePlanAndCycle = this.getPlan().equals(plan) && isSameCycle;
    const periodLapsed = this.currentPeriodEnd.getTime() < start.getTime();
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
      const periodStart =
        periodLapsed && isSamePlanAndCycle
          ? Subscription.resolvePaidPeriodStartAfterLapse(
              this.currentPeriodEnd,
              start,
            )
          : start;
      this.currentPeriodStart = periodStart;
      this.currentPeriodEnd = Subscription.calculatePeriodEnd(
        periodStart,
        billingCycle,
      );
    }

    this.status = new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE);
    this.graceUntil = null;
    this.updatedAt = start;
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
    now: Date,
    planMode?: string,
  ) {
    this.scheduledChange = {
      plan: plan.value,
      billingCycle: billingCycle.value,
      effectiveAt: effectiveAt.toISOString(),
      ...(planMode ? { planMode } : {}),
    };
    this.touchUpdatedAt(now);
  }

  clearScheduledPlanChange(now: Date) {
    this.scheduledChange = null;
    this.touchUpdatedAt(now);
  }

  /** Returns true if a scheduled change exists and its effectiveAt is in the past. */
  isScheduledChangeDue(now: Date): boolean {
    if (!this.scheduledChange) return false;
    return (
      new Date(this.scheduledChange.effectiveAt).getTime() <= now.getTime()
    );
  }

  /** Adds a positive amount to the account credit balance. */
  addAccountCredit(amountCents: number, now: Date) {
    if (amountCents <= 0) return;
    this.creditsCents += amountCents;
    this.touchUpdatedAt(now);
  }
}
