import { Subscription } from '@/domains/subscriptions/core/entities';

export interface ISubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findById(id: string): Promise<Subscription | null>;
  findByClinicId(clinicId: string): Promise<Subscription | null>;
  findByStatus(status: string): Promise<Subscription[]>;
  findApproachingRenewal(daysThreshold: number): Promise<Subscription[]>;
  update(subscription: Subscription): Promise<void>;
  delete(id: string): Promise<void>;
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
    details?: {
      paymentId?: string;
      signature?: string;
      subscriptionId?: string;
      invoiceUrl?: string;
      invoiceNumber?: string;
    },
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
}

export const SUBSCRIPTION_REPOSITORY_TOKEN = 'ISubscriptionRepository';
