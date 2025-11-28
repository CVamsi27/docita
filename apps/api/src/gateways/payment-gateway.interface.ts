/**
 * Abstract Payment Gateway Interface
 * Allows swapping payment providers (Razorpay, Stripe, etc.) based on region
 */

export interface CreateSubscriptionParams {
  customerId: string;
  planId: string;
  quantity?: number;
  startAt?: Date;
  totalCount?: number; // Number of billing cycles
  notes?: Record<string, string>;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  shortUrl?: string;
}

export interface CreateCheckoutParams {
  customerId: string;
  amountCents: number;
  currency: string;
  description: string;
  callbackUrl: string;
  notes?: Record<string, string>;
}

export interface CreateCheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  orderId: string;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  phone?: string;
  notes?: Record<string, string>;
}

export interface CreateCustomerResult {
  customerId: string;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface CreatePlanParams {
  name: string;
  description?: string;
  amountCents: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  intervalCount?: number;
}

export interface CreatePlanResult {
  planId: string;
}

export interface WebhookEvent {
  type: string;
  data: Record<string, unknown>;
  rawPayload: unknown;
}

export interface IPaymentGateway {
  readonly provider: string;

  // Customer management
  createCustomer(params: CreateCustomerParams): Promise<CreateCustomerResult>;
  getCustomer(customerId: string): Promise<Record<string, unknown> | null>;

  // Plan management
  createPlan(params: CreatePlanParams): Promise<CreatePlanResult>;
  getPlan(planId: string): Promise<Record<string, unknown> | null>;

  // Subscription management
  createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<CreateSubscriptionResult>;
  getSubscription(
    subscriptionId: string,
  ): Promise<Record<string, unknown> | null>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  // One-time payments / Checkout
  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

  // Webhook verification
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;
}

/**
 * Supported payment gateway providers
 */
export enum PaymentProvider {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  // Future: PAYPAL, PADDLE, etc.
}
