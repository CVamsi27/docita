/**
 * Prisma Subscription Repository
 * Production implementation of ISubscriptionRepository
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Subscription } from '../../core/entities';
import { ISubscriptionRepository } from '../../application/ports/subscription.repository.port';
import { SubscriptionMapper } from '../mappers/subscription.mapper';
import { PrismaService } from '../../../../prisma/prisma.service';

@Injectable()
export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Save (create) a new subscription
   */
  async save(subscription: Subscription): Promise<void> {
    try {
      const data = SubscriptionMapper.toPersistence(subscription);

      await this.prisma.subscription.create({
        data: data as any,
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to save subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find subscription by ID
   */
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

  /**
   * Find subscription by clinic ID (one-to-one)
   */
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

  /**
   * Find subscriptions by status
   */
  async findByStatus(status: string): Promise<Subscription[]> {
    try {
      const prismaSubscriptions = await this.prisma.subscription.findMany({
        where: { status: status as any },
      });

      return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
    } catch (error) {
      throw new BadRequestException(
        `Failed to find subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Find subscriptions approaching renewal
   */
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

  /**
   * Update subscription
   */
  async update(subscription: Subscription): Promise<void> {
    try {
      const existing = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
      });

      if (!existing) {
        throw new NotFoundException(`Subscription ${subscription.id} not found`);
      }

      // Check version for optimistic concurrency control
      if (existing.version !== subscription.version) {
        throw new BadRequestException(
          'Subscription was modified by another user. Please refresh and try again.',
        );
      }

      const data = SubscriptionMapper.toPersistence(subscription);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          ...data,
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

  /**
   * Delete subscription
   */
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
}
