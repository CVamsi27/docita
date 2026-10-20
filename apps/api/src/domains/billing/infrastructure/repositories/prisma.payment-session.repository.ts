import { Injectable } from '@nestjs/common';
import {
  paymentSessionMetaJsonSchema,
  paymentSessionWebhookPayloadSchema,
} from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPaymentSessionRepository,
  PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import { PaymentSession, PaymentSessionStatus, Prisma } from '@workspace/db';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import {
  PAYMENT_SESSION_DETAIL_INCLUDE,
  type PaymentSessionDetailRow,
} from '@/domains/billing/infrastructure/repositories/payment-session-detail.types';

@Injectable()
export class PrismaPaymentSessionRepository implements IPaymentSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapSession<T extends PaymentSession>(session: T): T {
    return {
      ...session,
      meta:
        parsePrismaJsonColumn(session.meta, paymentSessionMetaJsonSchema) ??
        null,
      webhookPayload:
        parsePrismaJsonColumn(
          session.webhookPayload,
          paymentSessionWebhookPayloadSchema,
        ) ?? null,
    };
  }

  private mapSessionDetail(
    session: PaymentSessionDetailRow,
  ): PaymentSessionDetail {
    return this.mapSession(session);
  }

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(
    data: Prisma.PaymentSessionCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession> {
    const client = tx ?? this.prisma;
    const created = await client.paymentSession.create({ data });
    return this.mapSession(created);
  }

  async findById(
    id: string,
    clinicId: string,
  ): Promise<PaymentSessionDetail | null> {
    const session = await this.getReadClient().paymentSession.findFirst({
      where: { id, clinicId },
      include: PAYMENT_SESSION_DETAIL_INCLUDE,
    });
    return session ? this.mapSessionDetail(session) : null;
  }

  async findByProviderSessionId(
    providerSessionId: string,
  ): Promise<PaymentSessionDetail | null> {
    const session = await this.getReadClient().paymentSession.findFirst({
      where: { providerSessionId },
      include: PAYMENT_SESSION_DETAIL_INCLUDE,
    });
    return session ? this.mapSessionDetail(session) : null;
  }

  async findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentSessionDetail | null> {
    const session = await this.getReadClient().paymentSession.findFirst({
      where: { provider, providerPaymentId },
      include: PAYMENT_SESSION_DETAIL_INCLUDE,
    });
    return session ? this.mapSessionDetail(session) : null;
  }

  async update(
    id: string,
    data: Prisma.PaymentSessionUpdateInput,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession> {
    const client = tx ?? this.prisma;
    const result = await client.paymentSession.updateMany({
      where: { id, clinicId },
      data,
    });
    if (result.count === 0) {
      throw new Error(`Payment session ${id} not found`);
    }

    const refreshed = await client.paymentSession.findFirst({
      where: { id, clinicId },
    });
    if (!refreshed) {
      throw new Error(`Payment session ${id} not found`);
    }
    return this.mapSession(refreshed);
  }

  async tryMarkCaptured(
    id: string,
    clinicId: string,
    data: Prisma.PaymentSessionUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? this.prisma;
    const result = await client.paymentSession.updateMany({
      where: {
        id,
        clinicId,
        providerPaymentId: null,
        status: {
          notIn: [PaymentSessionStatus.CAPTURED, PaymentSessionStatus.PAID],
        },
      },
      data,
    });
    return result.count === 1;
  }

  async findReconciliationCandidates(
    createdSince: Date,
    take: number,
  ): Promise<PaymentSessionDetail[]> {
    const sessions = await this.getReadClient().paymentSession.findMany({
      where: {
        providerSessionId: { not: null },
        providerPaymentId: null,
        createdAt: { gte: createdSince },
        status: {
          notIn: [
            PaymentSessionStatus.CAPTURED,
            PaymentSessionStatus.PAID,
            PaymentSessionStatus.CANCELLED,
            PaymentSessionStatus.REFUNDED,
          ],
        },
      },
      include: PAYMENT_SESSION_DETAIL_INCLUDE,
      orderBy: { createdAt: 'asc' },
      take,
    });
    return sessions.map((session) => this.mapSessionDetail(session));
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.paymentSession.deleteMany({
      where: { id, clinicId },
    });
  }

  async findByInvoiceId(
    invoiceId: string,
    clinicId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentSession[]> {
    const sessions = await (tx ?? this.getReadClient()).paymentSession.findMany(
      {
        where: { invoiceId, clinicId },
        orderBy: { createdAt: 'desc' },
      },
    );
    return sessions.map((session) => this.mapSession(session));
  }

  async findSettledByClinicInRange(
    clinicId: string,
    from: Date,
    to: Date,
  ): Promise<PaymentSession[]> {
    const sessions = await this.getReadClient().paymentSession.findMany({
      where: {
        clinicId,
        status: { in: ['CAPTURED', 'PAID'] },
        createdAt: { gte: from, lt: to },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((session) => this.mapSession(session));
  }

  async findPendingReminders(): Promise<PaymentSessionDetail[]> {
    const sessions = await this.getReadClient().paymentSession.findMany({
      where: {
        provider: 'razorpay',
        status: 'CREATED',
        NOT: {
          shortUrl: null,
        },
      },
      include: PAYMENT_SESSION_DETAIL_INCLUDE,
    });
    return sessions.map((session) => this.mapSessionDetail(session));
  }
}
