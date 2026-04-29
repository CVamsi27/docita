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

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async create(
    data: Prisma.PaymentSessionCreateInput,
  ): Promise<PaymentSession> {
    return this.prisma.paymentSession.create({ data });
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
    return session as PaymentSessionDetail | null;
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
    return refreshed;
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.paymentSession.deleteMany({
      where: { id, clinicId },
    });
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
    return sessions as PaymentSessionDetail[];
  }
}
