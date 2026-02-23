/**
 * Payment Gateway Port (Interface)
 * Defines contract for external payment processing
 */

import { Money } from '../../core/value-objects/money.value-object';

export interface PaymentGatewayResponse {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  message?: string;
  errorCode?: string;
}

export interface IPaymentGateway {
  createPaymentLink(
    invoiceId: string,
    amount: Money,
    description: string,
  ): Promise<{ url: string; linkId: string }>;

  capturePayment(
    transactionId: string,
    amount: Money,
  ): Promise<PaymentGatewayResponse>;

  refundPayment(
    transactionId: string,
    amount: Money,
  ): Promise<PaymentGatewayResponse>;

  verifyPayment(transactionId: string): Promise<PaymentGatewayResponse>;
}

export const PAYMENT_GATEWAY_TOKEN = 'IPaymentGateway';
