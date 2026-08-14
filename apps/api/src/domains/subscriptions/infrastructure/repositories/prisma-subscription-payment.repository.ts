import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { SubscriptionPaymentTaxCalculator } from './subscription-payment-tax.calculator';
import { toPrismaJson } from './prisma-subscription.repository.helpers';

/**
 * Shared shape for the gateway-callback fields that can accompany a payment
 * status transition — used by both `updatePaymentStatus` /
 * `updatePaymentStatusById` entry points and the `data` builder they funnel
 * into, so the optional fields can't drift between the three.
 */
type PaymentStatusUpdateDetails = {
  paymentId?: string;
  signature?: string;
  subscriptionId?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
};

@Injectable()
export class PrismaSubscriptionPaymentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentTaxCalculator: SubscriptionPaymentTaxCalculator,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  // jscpd:ignore-start
  async savePayment(payment: {
    clinicId: string;
    subscriptionId?: string;
    amountCents: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    description: string;
    razorpayPaymentId?: string;
    paidAt?: Date | null;
  }): Promise<void> {
    // jscpd:ignore-end
    // Infrastructure errors propagate to AllExceptionsFilter; the previous
    // try/catch+BadRequestException swallowed the Prisma error code and
    // downgraded 5xx to 4xx (see also the same fix in
    // prisma-subscription-core and prisma-appointment-read).
    const taxFields = await this.paymentTaxCalculator.calculate(payment);
    const resolvedPaidAt =
      payment.status === 'paid' || payment.status === 'PAID'
        ? (payment.paidAt ?? this.clock.now())
        : undefined;
    await this.prisma.subscriptionPayment.create({
      data: {
        clinicId: payment.clinicId,
        subscriptionId: payment.subscriptionId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        status: payment.status,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        description: payment.description,
        invoiceType: taxFields.invoiceType,
        subtotalCents: taxFields.subtotalCents,
        taxCents: taxFields.taxCents,
        grandTotalCents: taxFields.grandTotalCents,
        taxSummary: toPrismaJson(taxFields.taxSummary),
        sellerTaxSnapshot: toPrismaJson(taxFields.seller),
        buyerTaxSnapshot: toPrismaJson(taxFields.buyer),
        placeOfSupplyStateCode: taxFields.taxSummary.placeOfSupply?.stateCode,
        reverseCharge: taxFields.taxSummary.reverseCharge,
        paidAt: resolvedPaidAt,
      },
    });
  }

  async updatePaymentStatus(
    orderId: string,
    status: string,
    details?: PaymentStatusUpdateDetails,
  ): Promise<void> {
    return this.runPaymentStatusUpdate(
      { razorpayOrderId: orderId },
      status,
      details,
    );
  }

  async updatePaymentStatusById(
    clinicId: string,
    paymentId: string,
    status: string,
    details?: PaymentStatusUpdateDetails,
  ): Promise<void> {
    return this.runPaymentStatusUpdate(
      { id: paymentId, clinicId },
      status,
      details,
    );
  }

  /**
   * Shared `updateMany` for both payment-status entry points — they only
   * differ in how the target row is located (`where`). Errors propagate
   * to AllExceptionsFilter (see `savePayment` for the rationale).
   */
  private async runPaymentStatusUpdate(
    where: Prisma.SubscriptionPaymentWhereInput,
    status: string,
    details?: PaymentStatusUpdateDetails,
  ): Promise<void> {
    await this.prisma.subscriptionPayment.updateMany({
      where,
      data: this.buildPaymentStatusUpdate(status, details),
    });
  }

  private buildPaymentStatusUpdate(
    status: string,
    details?: PaymentStatusUpdateDetails,
  ) {
    return {
      status,
      razorpayPaymentId: details?.paymentId,
      razorpaySignature: details?.signature,
      subscriptionId: details?.subscriptionId,
      paidAt: status === 'paid' ? this.clock.now() : undefined,
      invoiceUrl: details?.invoiceUrl,
      invoiceNumber: details?.invoiceNumber,
    };
  }

  async findPaymentsByClinicId(
    clinicId: string,
    limit: number,
  ): Promise<
    Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs>[]
  > {
    return this.getReadClient().subscriptionPayment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findPaymentById(
    clinicId: string,
    paymentId: string,
  ): Promise<Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs> | null> {
    return this.getReadClient().subscriptionPayment.findFirst({
      where: { id: paymentId, clinicId },
    });
  }

  async findPaymentByOrderId(
    clinicId: string,
    orderId: string,
  ): Promise<Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs> | null> {
    return this.getReadClient().subscriptionPayment.findFirst({
      where: { clinicId, razorpayOrderId: orderId },
    });
  }

  async updatePaymentLink(params: {
    clinicId: string;
    paymentId: string;
    payUrl: string;
  }): Promise<void> {
    await this.prisma.subscriptionPayment.updateMany({
      where: { id: params.paymentId, clinicId: params.clinicId },
      data: {
        invoiceUrl: params.payUrl,
      },
    });
  }

  async expireDuplicatePendingCheckouts(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    keepOrderId: string;
  }): Promise<number> {
    const result = await this.prisma.subscriptionPayment.updateMany({
      where: {
        clinicId: params.clinicId,
        status: { in: ['pending', 'PENDING'] },
        amountCents: params.amountCents,
        currency: params.currency,
        description: params.description,
        razorpayOrderId: { not: params.keepOrderId },
      },
      data: { status: 'expired' },
    });

    return result.count;
  }

  async expireOtherPendingSubscriptionCheckouts(params: {
    clinicId: string;
    keepOrderId: string;
  }): Promise<number> {
    const result = await this.prisma.subscriptionPayment.updateMany({
      where: {
        clinicId: params.clinicId,
        status: { in: ['pending', 'PENDING'] },
        razorpayOrderId: { not: params.keepOrderId },
      },
      data: { status: 'expired' },
    });

    return result.count;
  }

  async findReusablePendingCheckout(params: {
    clinicId: string;
    amountCents: number;
    currency: string;
    description: string;
    withinMinutes: number;
  }): Promise<{ razorpayOrderId: string } | null> {
    const threshold = new Date(
      this.clock.now().getTime() - params.withinMinutes * 60 * 1000,
    );
    const row = await this.getReadClient().subscriptionPayment.findFirst({
      where: {
        clinicId: params.clinicId,
        status: { in: ['pending', 'PENDING'] },
        amountCents: params.amountCents,
        currency: params.currency,
        description: params.description,
        razorpayOrderId: { not: null },
        razorpayPaymentId: null,
        createdAt: { gte: threshold },
      },
      select: { razorpayOrderId: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!row?.razorpayOrderId) return null;
    return { razorpayOrderId: row.razorpayOrderId };
  }
}
