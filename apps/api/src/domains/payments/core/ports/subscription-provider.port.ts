import { IPaymentGateway } from '@/domains/payments/core/ports/payment-gateway.port';
import { BillingInterval } from '@/domains/payments/core/entities/billing-interval.enum';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

export interface CreateCustomerRequest {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface PaymentGatewayCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface CreatePlanRequest {
  name: string;
  amount: Money;
  interval: BillingInterval;
  intervalCount?: number;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionRequest {
  customerId: string;
  planId: string;
  quantity?: number;
  startDate?: Date;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface PaymentGatewaySubscription {
  id: string;
  customerId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, unknown>;
}

export interface ISubscriptionProvider extends IPaymentGateway {
  createCustomer(
    request: CreateCustomerRequest,
  ): Promise<PaymentGatewayCustomer>;
  getCustomer(customerId: string): Promise<PaymentGatewayCustomer | null>;
  updateCustomer(
    customerId: string,
    data: Partial<CreateCustomerRequest>,
  ): Promise<PaymentGatewayCustomer>;

  createPlan(request: CreatePlanRequest): Promise<{ planId: string }>;
  getPlan(planId: string): Promise<unknown>;

  createSubscription(
    request: CreateSubscriptionRequest,
  ): Promise<PaymentGatewaySubscription>;
  getSubscription(
    subscriptionId: string,
  ): Promise<PaymentGatewaySubscription | null>;
  cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;
}

export const SUBSCRIPTION_PROVIDER_TOKEN = Symbol('ISubscriptionProvider');
