import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BaseRazorpayAdapter } from './razorpay.adapter';
import {
  IRefundProvider,
  CreateRefundRequest,
  RefundResponse,
} from '@/domains/payments/core/ports';
import { RefundStatus } from '@/domains/payments/core/entities/refund-status.enum';
import { Money } from '@/domains/payments/core/value-objects/money.vo';

@Injectable()
export class RazorpayRefundAdapter
  extends BaseRazorpayAdapter
  implements IRefundProvider
{
  private readonly logger = new Logger(RazorpayRefundAdapter.name);

  async createRefund(request: CreateRefundRequest): Promise<RefundResponse> {
    try {
      const razorpay = this.getClient();
      const refund = await razorpay.payments.refund(request.paymentId, {
        ...(request.amount && { amount: request.amount.toCents() }),
        notes: {
          ...(request.metadata || {}),
          ...(request.reason && { reason: request.reason }),
        },
      });

      return {
        refundId: refund.id,
        amount: Money.fromCents(refund.amount || 0, refund.currency),
        status: this.mapRefundStatus(refund.status),
        createdAt: new Date(refund.created_at * 1000),
      };
    } catch (error) {
      this.logger.error('Failed to create refund', error);
      throw new BadRequestException('Failed to create refund');
    }
  }

  async getRefund(refundId: string): Promise<RefundResponse | null> {
    try {
      const razorpay = this.getClient();
      const refund = await razorpay.refunds.fetch(refundId);

      return {
        refundId: refund.id,
        amount: Money.fromCents(refund.amount || 0, refund.currency),
        status: this.mapRefundStatus(refund.status),
        createdAt: new Date(refund.created_at * 1000),
      };
    } catch (error) {
      this.logger.warn(`Refund ${refundId} not found`);
      return null;
    }
  }

  private mapRefundStatus(razorpayStatus: string): RefundStatus {
    const statusMap: Record<string, RefundStatus> = {
      pending: RefundStatus.PENDING,
      processing: RefundStatus.PROCESSING,
      processed: RefundStatus.SUCCEEDED,
      failed: RefundStatus.FAILED,
    };

    return statusMap[razorpayStatus] || RefundStatus.PENDING;
  }
}
