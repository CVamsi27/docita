import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPaymentSessionRepository,
  PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import { PaymentSession, Prisma } from '@workspace/db';

@Injectable()
export class PrismaPaymentSessionRepository implements IPaymentSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.PaymentSessionCreateInput,
  ): Promise<PaymentSession> {
    return this.prisma.paymentSession.create({ data });
  }

  async findById(id: string): Promise<PaymentSessionDetail | null> {
    const session = await this.prisma.paymentSession.findUnique({
      where: { id },
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
    const session = await this.prisma.paymentSession.findFirst({
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
    return session as PaymentSessionDetail | null;
  }

  async update(
    id: string,
    data: Prisma.PaymentSessionUpdateInput,
  ): Promise<PaymentSession> {
    return this.prisma.paymentSession.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.paymentSession.delete({ where: { id } });
  }

  async findPendingReminders(): Promise<PaymentSessionDetail[]> {
    const sessions = await this.prisma.paymentSession.findMany({
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
    return sessions as PaymentSessionDetail[];
  }
}
