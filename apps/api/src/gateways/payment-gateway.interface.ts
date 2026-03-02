export interface CreateSubscriptionParams {
  customerId: string;
  planId: string;
  quantity?: number;
  startAt?: Date;
  totalCount?: number;
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

  createCustomer(params: CreateCustomerParams): Promise<CreateCustomerResult>;
  getCustomer(customerId: string): Promise<Record<string, unknown> | null>;

  createPlan(params: CreatePlanParams): Promise<CreatePlanResult>;
  getPlan(planId: string): Promise<Record<string, unknown> | null>;

  createSubscription(
    params: CreateSubscriptionParams,
  ): Promise<CreateSubscriptionResult>;
  getSubscription(
    subscriptionId: string,
  ): Promise<Record<string, unknown> | null>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: unknown): WebhookEvent;

  chargeWithToken?(
    customerId: string,
    tokenId: string,
    amountCents: number,
    currency: string,
    description: string,
  ): Promise<{ paymentId: string; status: string }>;
}

export enum PaymentProvider {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
}
