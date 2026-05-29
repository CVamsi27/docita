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
import { PaymentSession, Prisma } from '@workspace/db';
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

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.paymentSession.deleteMany({
      where: { id, clinicId },
    });
  }

  async findByInvoiceId(
    invoiceId: string,
    clinicId: string,
  ): Promise<PaymentSession[]> {
    const sessions = await this.getReadClient().paymentSession.findMany({
      where: { invoiceId, clinicId },
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
