import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Subscription } from '../../core/entities';
import { ISubscriptionRepository } from '../../application/ports/subscription.repository.port';
import { SubscriptionMapper } from '../mappers/subscription.mapper';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SubscriptionStatus, Prisma } from '@workspace/db';

const SubscriptionPaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

type SubscriptionPaymentStatus =
  (typeof SubscriptionPaymentStatus)[keyof typeof SubscriptionPaymentStatus];

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(subscription: Subscription): Promise<void> {
    try {
      const data = SubscriptionMapper.toPersistence(subscription);

      await this.prisma.subscription.create({
        data: data,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to save subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findById(id: string): Promise<Subscription | null> {
    try {
      const prismaSubscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!prismaSubscription) {
        return null;
      }

      return SubscriptionMapper.toDomain(prismaSubscription);
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByClinicId(clinicId: string): Promise<Subscription | null> {
    try {
      const prismaSubscription = await this.prisma.subscription.findUnique({
        where: { clinicId },
      });

      if (!prismaSubscription) {
        return null;
      }

      return SubscriptionMapper.toDomain(prismaSubscription);
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findByStatus(status: string): Promise<Subscription[]> {
    try {
      const prismaSubscriptions = await this.prisma.subscription.findMany({
        where: { status: status as SubscriptionStatus },
      });

      return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findApproachingRenewal(daysThreshold: number): Promise<Subscription[]> {
    try {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + daysThreshold);

      const prismaSubscriptions = await this.prisma.subscription.findMany({
        where: {
          currentPeriodEnd: {
            lte: renewalDate,
            gte: new Date(),
          },
          status: 'ACTIVE',
        },
      });

      return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
    } catch (error) {
      throw new BadRequestException(
        `Failed to find approaching renewals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async update(subscription: Subscription): Promise<void> {
    try {
      const existing = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      if (!existing) {
        throw new NotFoundException(
          `Subscription ${subscription.id} not found`,
        );
      }

      if (existing.version !== subscription.version) {
        throw new BadRequestException(
          'Subscription was modified by another user. Please refresh and try again.',
        );
      }

      const data = SubscriptionMapper.toPersistence(subscription);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          ...(data as Prisma.SubscriptionUncheckedUpdateInput),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription ${id} not found`);
      }

      await this.prisma.subscription.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to delete subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async savePayment(payment: {
    clinicId: string;
    subscriptionId?: string;
    amountCents: number;
    currency: string;
    status: string;
    razorpayOrderId: string;
    description: string;
  }): Promise<void> {
    try {
      await this.prisma.subscriptionPayment.create({
        data: {
          clinicId: payment.clinicId,
          subscriptionId: payment.subscriptionId,
          amountCents: payment.amountCents,
          currency: payment.currency,
          status: payment.status,
          razorpayOrderId: payment.razorpayOrderId,
          description: payment.description,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to save payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async updatePaymentStatus(
    orderId: string,
    status: string,
    details?: {
      paymentId?: string;
      signature?: string;
      subscriptionId?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.subscriptionPayment.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          status: status,
          razorpayPaymentId: details?.paymentId,
          razorpaySignature: details?.signature,
          subscriptionId: details?.subscriptionId,
          paidAt: status === 'paid' ? new Date() : undefined,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to update payment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async findPaymentsByClinicId(
    clinicId: string,
    limit: number,
  ): Promise<
    Prisma.SubscriptionPaymentGetPayload<Prisma.SubscriptionPaymentDefaultArgs>[]
  > {
    return this.prisma.subscriptionPayment.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
