export interface CreateOrderRequest {
  amountCents: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  orderId: string;
  description: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResponse {
  razorpayOrderId: string;
  amountCents: number;
  currency: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  paymentId: string;
  orderId: string;
  amountCents: number;
}

export interface IPaymentGateway {
  createCustomer(request: {
    email: string;
    name: string;
    phone?: string;
    clinicId: string;
  }): Promise<string>;
  updateCustomer(
    customerId: string,
    request: {
      email: string;
      name: string;
      phone?: string;
      clinicId: string;
    },
  ): Promise<void>;
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;
  createSubscription(
    planId: string,
    customerId: string,
    totalCount: number,
  ): Promise<{ subscriptionId: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  refundPayment(paymentId: string, amountCents?: number): Promise<void>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

export const PAYMENT_GATEWAY_TOKEN = 'IPaymentGateway';
