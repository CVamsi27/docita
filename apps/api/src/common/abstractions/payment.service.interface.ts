/**
 * Payment Service Interface
 *
 * Defines the contract for payment processing.
 * Allows multiple payment gateway implementations (Razorpay, Stripe, etc.)
 *
 * @interface IPaymentService
 */
export interface IPaymentService {
  /**
   * Create a payment order for a patient invoice
   * @param invoiceId - Invoice ID
   * @param amount - Amount in the smallest currency unit (paise for INR)
   * @param currency - Currency code (e.g., 'INR')
   * @param metadata - Additional metadata for the order
   * @returns Promise with order details
   */
  createOrder(
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    status: 'created' | 'failed';
  }>;

  /**
   * Verify payment signature (webhook validation)
   * @param orderId - Order ID from payment gateway
   * @param paymentId - Payment ID from payment gateway
   * @param signature - Signature from payment webhook
   * @returns Promise with verification result
   */
  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{
    verified: boolean;
    status: 'authorized' | 'captured' | 'failed';
  }>;

  /**
   * Capture a payment that was authorized
   * @param paymentId - Payment ID to capture
   * @returns Promise with capture result
   */
  capturePayment(paymentId: string): Promise<{
    success: boolean;
    transactionId: string;
  }>;

  /**
   * Refund a payment
   * @param paymentId - Payment ID to refund
   * @param amount - Amount to refund (full refund if not specified)
   * @param reason - Refund reason
   * @returns Promise with refund result
   */
  refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<{
    refundId: string;
    status: 'processed' | 'pending' | 'failed';
    amount: number;
  }>;

  /**
   * Get payment details
   * @param paymentId - Payment ID
   * @returns Promise with payment details
   */
  getPaymentDetails(paymentId: string): Promise<{
    paymentId: string;
    orderId: string;
    amount: number;
    status: 'authorized' | 'captured' | 'failed' | 'refunded';
    createdAt: Date;
  }>;

  /**
   * Create a subscription for recurring billing
   * @param customerId - Customer ID
   * @param planId - Billing plan ID
   * @param metadata - Additional metadata
   * @returns Promise with subscription details
   */
  createSubscription(
    customerId: string,
    planId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    subscriptionId: string;
    status: 'active' | 'pending' | 'failed';
    nextBillingDate: Date;
  }>;

  /**
   * Cancel a subscription
   * @param subscriptionId - Subscription ID to cancel
   * @param immediately - Cancel immediately or at period end
   * @returns Promise with cancellation result
   */
  cancelSubscription(
    subscriptionId: string,
    immediately?: boolean,
  ): Promise<{
    success: boolean;
    cancelledAt: Date;
  }>;
}

export const PAYMENT_SERVICE_TOKEN = 'IPaymentService';
