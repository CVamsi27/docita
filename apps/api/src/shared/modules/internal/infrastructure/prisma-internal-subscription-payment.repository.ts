import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  InternalSubscriptionPaymentRepository,
  MonthlySubscriptionRevenueRow,
} from '@/shared/modules/internal/ports/internal-subscription-payment.repository.port';

@Injectable()
export class PrismaInternalSubscriptionPaymentRepository implements InternalSubscriptionPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPaidRevenueGroupedByMonth(
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<MonthlySubscriptionRevenueRow[]> {
    return this.prisma.$queryRaw<MonthlySubscriptionRevenueRow[]>`
      SELECT
        date_trunc('month', "paidAt") AS "monthStart",
        COALESCE(SUM("amountCents"), 0)::bigint AS "revenueCents"
      FROM "SubscriptionPayment"
      WHERE
        status = 'paid'
        AND "paidAt" IS NOT NULL
        AND "paidAt" >= ${rangeStart}
        AND "paidAt" < ${rangeEndExclusive}
      GROUP BY date_trunc('month', "paidAt")
      ORDER BY date_trunc('month', "paidAt") ASC
    `;
  }
}
