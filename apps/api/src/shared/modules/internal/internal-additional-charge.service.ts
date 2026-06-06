import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SUBSCRIPTION_REPOSITORY_TOKEN,
  type ISubscriptionRepository,
} from '@/domains/subscriptions/application/ports';
import type { InternalAdditionalChargeCategory } from '@workspace/types';
import {
  INTERNAL_ADDITIONAL_CHARGE_CATEGORY_LABELS,
  INTERNAL_ADDITIONAL_CHARGE_PREFIX,
} from './internal-billing-payment.mapper';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

const INTERNAL_PAYMENT_METHOD_LABELS: Record<string, string> = {
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  bank_transfer: 'Bank transfer',
  manual: 'Manual',
};

@Injectable()
export class InternalAdditionalChargeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SUBSCRIPTION_REPOSITORY_TOKEN)
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async recordAdditionalCharge(
    clinicId: string,
    data: {
      amount: number;
      currency?: string;
      category: InternalAdditionalChargeCategory;
      paymentMethod: string;
      razorpayPaymentId?: string;
      notes?: string;
    },
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { id: true, currency: true },
    });
    if (!clinic) {
      throw new BadRequestException('Clinic not found');
    }
    const amountCents = Math.round(data.amount * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      throw new BadRequestException('Invalid amount');
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const orderId = `int_addl_${randomUUID().replace(/-/g, '')}`;
    const categoryLabel =
      INTERNAL_ADDITIONAL_CHARGE_CATEGORY_LABELS[data.category];
    const methodLabel =
      INTERNAL_PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod;
    const descriptionHead = `${INTERNAL_ADDITIONAL_CHARGE_PREFIX}${data.category}] ${categoryLabel} (${methodLabel})`;
    const description = [descriptionHead, data.notes]
      .filter((part) => typeof part === 'string' && part.trim().length > 0)
      .join(' · ')
      .slice(0, 500);

    const currency = (data.currency ?? clinic.currency ?? 'INR').toUpperCase();

    await this.subscriptionRepository.savePayment({
      clinicId,
      subscriptionId: subscription?.id,
      amountCents,
      currency,
      status: 'paid',
      razorpayOrderId: orderId,
      description,
      razorpayPaymentId: data.razorpayPaymentId,
      paidAt: this.clock.now(),
    });

    return {
      success: true,
      internalOrderId: orderId,
      amount: data.amount,
      currency,
    };
  }
}
