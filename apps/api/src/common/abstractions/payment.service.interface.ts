export interface IPaymentService {
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

  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<{
    verified: boolean;
    status: 'authorized' | 'captured' | 'failed';
  }>;

  capturePayment(paymentId: string): Promise<{
    success: boolean;
    transactionId: string;
  }>;

  refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
  ): Promise<{
    refundId: string;
    status: 'processed' | 'pending' | 'failed';
    amount: number;
  }>;

  getPaymentDetails(paymentId: string): Promise<{
    paymentId: string;
    orderId: string;
    amount: number;
    status: 'authorized' | 'captured' | 'failed' | 'refunded';
    createdAt: Date;
  }>;

  createSubscription(
    customerId: string,
    planId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    subscriptionId: string;
    status: 'active' | 'pending' | 'failed';
    nextBillingDate: Date;
  }>;

  cancelSubscription(
    subscriptionId: string,
    immediately?: boolean,
  ): Promise<{
    success: boolean;
    cancelledAt: Date;
  }>;
}

export const PAYMENT_SERVICE_TOKEN = 'IPaymentService';
