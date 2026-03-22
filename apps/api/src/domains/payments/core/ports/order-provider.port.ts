import { IPaymentGateway } from '@/domains/payments/core/ports/payment-gateway.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

export interface CreateOrderRequest {
  amount: Money;
  customerId?: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface PaymentGatewayOrder {
  id: string;
  amount: Money;
  currency: string;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentRequest {
  paymentId: string;
  orderId: string;
  signature: string;
}

export interface PaymentGatewayPayment {
  id: string;
  orderId: string;
  amount: Money;
  status: string;
  method: string;
  capturedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  payment?: PaymentGatewayPayment;
}

export interface IOrderProvider extends IPaymentGateway {
  createOrder(request: CreateOrderRequest): Promise<PaymentGatewayOrder>;
  getOrder(orderId: string): Promise<PaymentGatewayOrder | null>;
  capturePayment(orderId: string): Promise<PaymentGatewayPayment>;
  verifyPayment(request: VerifyPaymentRequest): Promise<VerifyPaymentResponse>;
}

export const ORDER_PROVIDER_TOKEN = Symbol('IOrderProvider');
