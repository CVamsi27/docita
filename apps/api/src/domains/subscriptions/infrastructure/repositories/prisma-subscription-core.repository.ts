import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { Subscription } from '@/domains/subscriptions/core/entities';
import { SubscriptionMapper } from '@/domains/subscriptions/infrastructure/mappers/subscription.mapper';
import { PrismaService } from '@/prisma/prisma.service';
import { Role, SubscriptionStatus } from '@workspace/db';
import { parseStringEnumMember } from '@workspace/utils';
import { BULK_READ_LIMIT } from '@/shared/common/constants/bulk-read-limit.constant';
import {
  ConflictDomainError,
  NotFoundDomainError,
} from '@/shared/common/errors/domain.errors';
import type {
  SubscriptionBillingContact,
  SubscriptionExpiryReminderCandidate,
  SubscriptionGraceDeadlineReminderCandidate,
  SubscriptionReminderCreateInput,
} from '@/domains/subscriptions/application/ports/subscription.repository.port';

const SUBSCRIPTION_STATUS_VALUES = Object.values(SubscriptionStatus);

@Injectable()
export class PrismaSubscriptionCoreRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async save(subscription: Subscription): Promise<void> {
    // Domain rule (optimistic concurrency) is the only thing this method
    // owns. Infrastructure errors propagate to AllExceptionsFilter which
    // maps Prisma's structured errors to proper HTTP responses.
    const data = SubscriptionMapper.toPersistence(subscription);
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      select: { version: true },
    });

    if (existing) {
      if (existing.version !== subscription.version)
        throw new ConflictDomainError(
          'Subscription was modified by another user. Please refresh and try again.',
        );

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          ...data,
          version: { increment: 1 },
        },
      });
      return;
    }

    await this.prisma.subscription.create({
      data: data,
    });
  }

  private async findUniqueSubscription(
    where: { id: string } | { clinicId: string },
  ): Promise<Subscription | null> {
    const prismaSubscription =
      await this.getReadClient().subscription.findUnique({ where });

    if (!prismaSubscription) return null;

    return SubscriptionMapper.toDomain(prismaSubscription);
  }

  async findById(id: string): Promise<Subscription | null> {
    return this.findUniqueSubscription({ id });
  }

  async findByClinicId(clinicId: string): Promise<Subscription | null> {
    return this.findUniqueSubscription({ clinicId });
  }

  async findByStatus(status: string): Promise<Subscription[]> {
    const prismaSubscriptions =
      await this.getReadClient().subscription.findMany({
        where: {
          status:
            parseStringEnumMember(SUBSCRIPTION_STATUS_VALUES, status) ??
            SubscriptionStatus.ACTIVE,
        },
        take: BULK_READ_LIMIT,
      });

    return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
  }

  async findApproachingRenewal(daysThreshold: number): Promise<Subscription[]> {
    const now = this.clock.now();
    const renewalDate = new Date(now);
    renewalDate.setDate(renewalDate.getDate() + daysThreshold);

    const prismaSubscriptions =
      await this.getReadClient().subscription.findMany({
        where: {
          currentPeriodEnd: {
            lte: renewalDate,
            gte: now,
          },
          status: SubscriptionStatus.ACTIVE,
        },
        take: BULK_READ_LIMIT,
      });

    return prismaSubscriptions.map((s) => SubscriptionMapper.toDomain(s));
  }

  async update(subscription: Subscription): Promise<void> {
    const existing = await this.prisma.subscription.findUnique({
      where: { id: subscription.id },
    });

    if (!existing) {
      throw new NotFoundDomainError(
        `Subscription ${subscription.id} not found`,
      );
    }

    if (existing.version !== subscription.version)
      throw new ConflictDomainError(
        'Subscription was modified by another user. Please refresh and try again.',
      );

    const data = SubscriptionMapper.toPersistence(subscription);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });
  }

  async markClinicPastDue(clinicId: string, graceUntil: Date): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { clinicId },
      data: {
        status: 'PAST_DUE',
        graceUntil,
      },
    });
  }

  async findBillingContact(
    clinicId: string,
  ): Promise<SubscriptionBillingContact> {
    const clinic = await this.getReadClient().clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, email: true, phone: true },
    });

    const primaryAdmin = await this.getReadClient().user.findFirst({
      where: {
        clinicId,
        role: { in: [Role.ADMIN, Role.ADMIN_DOCTOR] },
      },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (primaryAdmin) {
      return {
        name: primaryAdmin.name ?? clinic?.name ?? null,
        email: primaryAdmin.email ?? clinic?.email ?? null,
        phoneNumber: primaryAdmin.phoneNumber ?? clinic?.phone ?? null,
      };
    }

    const fallbackUser = await this.getReadClient().user.findFirst({
      where: { clinicId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (fallbackUser) {
      return {
        name: fallbackUser.name ?? clinic?.name ?? null,
        email: fallbackUser.email ?? clinic?.email ?? null,
        phoneNumber: fallbackUser.phoneNumber ?? clinic?.phone ?? null,
      };
    }

    return {
      name: clinic?.name ?? null,
      email: clinic?.email ?? null,
      phoneNumber: clinic?.phone ?? null,
    };
  }

  private getReminderInclude() {
    return {
      clinic: {
        include: {
          users: {
            where: {
              role: { in: ['ADMIN' as const, 'ADMIN_DOCTOR' as const] },
            },
            select: { email: true, name: true },
          },
        },
      },
    };
  }

  async findExpiryReminderCandidates(params: {
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<SubscriptionExpiryReminderCandidate[]> {
    return this.getReadClient().subscription.findMany({
      where: {
        currentPeriodEnd: { gte: params.startOfDay, lte: params.endOfDay },
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      take: BULK_READ_LIMIT,
      include: this.getReminderInclude(),
    });
  }

  async findGraceDeadlineReminderCandidates(params: {
    startOfDay: Date;
    endOfDay: Date;
  }): Promise<SubscriptionGraceDeadlineReminderCandidate[]> {
    return this.getReadClient().subscription.findMany({
      where: {
        graceUntil: { gte: params.startOfDay, lte: params.endOfDay },
        status: {
          in: [SubscriptionStatus.GRACE, SubscriptionStatus.PAST_DUE],
        },
      },
      take: BULK_READ_LIMIT,
      include: this.getReminderInclude(),
    });
  }

  async findRecentReminderClinicIds(params: {
    clinicIds: string[];
    reminderType: string;
    reminderCutoff: Date;
  }): Promise<string[]> {
    const existingReminders =
      await this.getReadClient().subscriptionReminder.findMany({
        where: {
          clinicId: { in: params.clinicIds },
          type: params.reminderType,
          sentAt: { gte: params.reminderCutoff },
        },
        select: { clinicId: true },
      });

    return existingReminders.map((reminder) => reminder.clinicId);
  }

  async createSubscriptionReminders(
    reminders: SubscriptionReminderCreateInput[],
  ): Promise<void> {
    if (reminders.length === 0) return;
    await this.prisma.subscriptionReminder.createMany({
      data: reminders,
    });
  }

  async delete(id: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundDomainError(`Subscription ${id} not found`);
    }

    await this.prisma.subscription.delete({
      where: { id },
    });
  }
}
