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
  }): Promise<void>;
  updatePaymentStatus(
    orderId: string,
    status: string,
    details?: {
      paymentId?: string;
      signature?: string;
      subscriptionId?: string;
    },
  ): Promise<void>;
  findPaymentsByClinicId(clinicId: string, limit: number): Promise<unknown[]>;
  findPaymentById(clinicId: string, paymentId: string): Promise<unknown | null>;
  updatePaymentLink(params: {
    clinicId: string;
    paymentId: string;
    payUrl: string;
  }): Promise<void>;

  findReusablePendingCheckout(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    withinMinutes: number;
  }): Promise<{ razorpayOrderId: string } | null>;
}

export const SUBSCRIPTION_REPOSITORY_TOKEN = 'ISubscriptionRepository';
