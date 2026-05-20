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

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(
    data: Prisma.PaymentSessionCreateInput,
  ): Promise<PaymentSession> {
    const created = await this.prisma.paymentSession.create({ data });
    return this.mapSession(created);
  }

  async findById(
    id: string,
    clinicId: string,
  ): Promise<PaymentSessionDetail | null> {
    const session = await this.getReadClient().paymentSession.findFirst({
      where: { id, clinicId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
        clinic: {
          select: {
            phone: true,
          },
        },
      },
    });
    return session as PaymentSessionDetail | null;
  }

  async findByProviderSessionId(
    providerSessionId: string,
  ): Promise<PaymentSessionDetail | null> {
    const session = await this.getReadClient().paymentSession.findFirst({
      where: { providerSessionId },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
        clinic: {
          select: {
            phone: true,
          },
        },
      },
    });
    return session ? this.mapSession(session as PaymentSessionDetail) : null;
  }

  async update(
    id: string,
    data: Prisma.PaymentSessionUpdateInput,
    clinicId: string,
  ): Promise<PaymentSession> {
    const result = await this.prisma.paymentSession.updateMany({
      where: { id, clinicId },
      data: data as Prisma.PaymentSessionUpdateManyMutationInput,
    });
    if (result.count === 0) {
      throw new Error(`Payment session ${id} not found`);
    }

    const refreshed = await this.prisma.paymentSession.findFirst({
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
        status: 'CREATED',
        NOT: {
          shortUrl: null,
        },
      },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
        clinic: {
          select: {
            phone: true,
          },
        },
      },
    });
    return sessions.map((session) =>
      this.mapSession(session as PaymentSessionDetail),
    );
  }
}
