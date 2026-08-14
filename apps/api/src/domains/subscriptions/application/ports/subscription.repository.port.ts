import { Subscription } from '@/domains/subscriptions/core/entities';

export type SubscriptionBillingContact = {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
};

// Shared by `updatePaymentStatus` and `updatePaymentStatusById` — both accept
// the same optional gateway-callback fields when transitioning a payment's
// status, differing only in how the target payment is looked up.
export type SubscriptionPaymentStatusDetails = {
  paymentId?: string;
  signature?: string;
  subscriptionId?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
};

export type SubscriptionReminderRecipient = {
  email: string | null;
  name: string | null;
};

export type SubscriptionExpiryReminderCandidate = {
  id: string;
  clinicId: string;
  currentPeriodEnd: Date;
  status: string;
  clinic: {
    name: string | null;
    users: SubscriptionReminderRecipient[];
  } | null;
};

export type SubscriptionGraceDeadlineReminderCandidate = {
  id: string;
  clinicId: string;
  graceUntil: Date | null;
  clinic: {
    name: string | null;
    users: SubscriptionReminderRecipient[];
  } | null;
};

export type SubscriptionReminderCreateInput = {
  clinicId: string;
  subscriptionId: string;
  type: string;
  channel: string;
  status: string;
  sentAt: Date | null;
  errorMessage: string | null;
};

export interface ISubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  findByClinicId(clinicId: string): Promise<Subscription | null>;
  findByStatus(status: string): Promise<Subscription[]>;
  findApproachingRenewal(daysThreshold: number): Promise<Subscription[]>;
  update(subscription: Subscription): Promise<void>;
  markClinicPastDue(clinicId: string, graceUntil: Date): Promise<void>;
  delete(id: string): Promise<void>;
  findBillingContact(clinicId: string): Promise<SubscriptionBillingContact>;
  findExpiryReminderCandidates(params: {
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<SubscriptionExpiryReminderCandidate[]>;
  findGraceDeadlineReminderCandidates(params: {
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<SubscriptionGraceDeadlineReminderCandidate[]>;
  findRecentReminderClinicIds(params: {
    clinicIds: string[];
    reminderType: string;
    reminderCutoff: Date;
  }): Promise<string[]>;
  createSubscriptionReminders(
    reminders: SubscriptionReminderCreateInput[],
  ): Promise<void>;
  savePayment(payment: {
    clinicId: string;
    subscriptionId?: string;
    amountCents: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    description: string;
    razorpayPaymentId?: string;
    paidAt?: Date | null;
  }): Promise<void>;
  updatePaymentStatus(
    orderId: string,
    status: string,
    details?: SubscriptionPaymentStatusDetails,
  ): Promise<void>;
  updatePaymentStatusById(
    clinicId: string,
    paymentId: string,
    status: string,
    details?: SubscriptionPaymentStatusDetails,
  ): Promise<void>;
  findPaymentsByClinicId(clinicId: string, limit: number): Promise<unknown[]>;
  findPaymentById(clinicId: string, paymentId: string): Promise<unknown | null>;
  findPaymentByOrderId(
    clinicId: string,
    orderId: string,
  ): Promise<unknown | null>;
  updatePaymentLink(params: {
    clinicId: string;
    paymentId: string;
    payUrl: string;
  }): Promise<void>;
  expireDuplicatePendingCheckouts(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    keepOrderId: string;
  }): Promise<number>;

  /**
   * Marks every other pending subscription checkout for the clinic as expired
   * so only one active "Pay now" row remains (avoids abandoned Essential vs Pro
   * orders stacking in billing history).
   */
  expireOtherPendingSubscriptionCheckouts(params: {
    clinicId: string;
    keepOrderId: string;
  }): Promise<number>;

  findReusablePendingCheckout(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    withinMinutes: number;
  }): Promise<{ razorpayOrderId: string } | null>;

  /**
   * Audit FL11: idempotency lookup for Razorpay payment webhooks.
   * Returns the row id if a `SubscriptionPayment` already exists for the given
   * Razorpay payment id, otherwise null. Backed by the unique index on
   * `SubscriptionPayment.razorpayPaymentId` (see migration
   * `20260523190000_audit_subscription_payment_idempotency`).
   */
  findPaymentByRazorpayPaymentId(
    razorpayPaymentId: string,
  ): Promise<{ id: string } | null>;
}

export const SUBSCRIPTION_REPOSITORY_TOKEN = 'ISubscriptionRepository';
