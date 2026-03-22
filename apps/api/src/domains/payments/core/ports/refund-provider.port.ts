import { IPaymentGateway } from '@/domains/payments/core/ports/payment-gateway.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import { RefundStatus } from '@/domains/payments/core/entities/refund-status.enum';

export interface CreateRefundRequest {
  paymentId: string;
  amount?: Money;
  reason?: string;
  metadata?: Record<string, string>;
}

export interface RefundResponse {
  refundId: string;
  amount: Money;
  status: RefundStatus;
  createdAt: Date;
}

export interface IRefundProvider extends IPaymentGateway {
  createRefund(request: CreateRefundRequest): Promise<RefundResponse>;
  getRefund(refundId: string): Promise<RefundResponse | null>;
}

export const REFUND_PROVIDER_TOKEN = Symbol('IRefundProvider');
