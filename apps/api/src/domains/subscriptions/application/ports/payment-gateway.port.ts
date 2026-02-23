/**
 * Payment Gateway Port
 * Abstract interface for payment processing (Razorpay)
 */

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
  /**
   * Create a payment order
   */
  createOrder(request: CreateOrderRequest): Promise<CreateOrderResponse>;

  /**
   * Verify payment signature
   */
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;

  /**
   * Create subscription on payment gateway
   */
  createSubscription(
    planId: string,
    customerId: string,
    totalCount: number, // e.g., 12 for yearly = 12 months
  ): Promise<{ subscriptionId: string }>;

  /**
   * Cancel subscription on payment gateway
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Refund payment
   */
  refundPayment(paymentId: string, amountCents?: number): Promise<void>;
}

export const PAYMENT_GATEWAY_TOKEN = 'IPaymentGateway';
