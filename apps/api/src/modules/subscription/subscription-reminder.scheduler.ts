/**
 * Subscription Reminder Scheduler
 * Sends reminders for expiring subscriptions and handles grace period expirations
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionBillingService } from './subscription-billing.service';
import { ClinicTier } from '@workspace/db';

interface ReminderConfig {
  daysBeforeExpiry: number;
  type: string;
}

const REMINDER_SCHEDULE: ReminderConfig[] = [
  { daysBeforeExpiry: 7, type: 'expiry_7d' },
  { daysBeforeExpiry: 3, type: 'expiry_3d' },
  { daysBeforeExpiry: 1, type: 'expiry_1d' },
];

const GRACE_PERIOD_DAYS = 3;

@Injectable()
export class SubscriptionReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private billingService: SubscriptionBillingService,
  ) {}

  onModuleInit() {
    this.logger.log('Subscription reminder scheduler initialized');
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringSubscriptions() {
    this.logger.log('Checking for expiring subscriptions...');
    const now = new Date();

    for (const config of REMINDER_SCHEDULE) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + config.daysBeforeExpiry);

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          currentPeriodEnd: { gte: startOfDay, lte: endOfDay },
          status: { in: ['ACTIVE', 'TRIALING'] },
        },
        include: {
          clinic: {
            include: {
              users: {
                where: { role: 'ADMIN' },
                select: { email: true, name: true },
              },
            },
          },
        },
      });

      for (const subscription of expiringSubscriptions) {
        const existingReminder =
          await this.prisma.subscriptionReminder.findFirst({
            where: {
              clinicId: subscription.clinicId,
              type: config.type,
              sentAt: { gte: startOfDay },
            },
          });

        if (!existingReminder) {
          await this.sendExpirationReminder(subscription, config);
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async checkGracePeriodExpirations() {
    this.logger.log('Checking for grace period expirations...');
    const now = new Date();
    const graceExpireDate = new Date(now);
    graceExpireDate.setDate(graceExpireDate.getDate() - GRACE_PERIOD_DAYS);

    const expiredGraceSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'GRACE',
        currentPeriodEnd: { lte: graceExpireDate },
      },
      include: { clinic: true },
    });

    for (const subscription of expiredGraceSubscriptions) {
      await this.handleGracePeriodExpiration(subscription);
    }
  }

  @Cron('0 9 * * 1')
  async sendWeeklyAdminSummary() {
    this.logger.log('Generating weekly admin subscription summary...');
    const now = new Date();
    const oneWeekFromNow = new Date(now);
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const statusCounts = await this.prisma.subscription.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const expiringCount = await this.prisma.subscription.count({
      where: {
        currentPeriodEnd: { gte: now, lte: oneWeekFromNow },
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = await this.prisma.subscriptionPayment.aggregate({
      where: { paidAt: { gte: startOfMonth }, status: 'paid' },
      _sum: { amountCents: true },
    });

    const graceCount = await this.prisma.subscription.count({
      where: { status: 'GRACE' },
    });

    const summary = {
      date: now.toISOString(),
      subscriptionsByStatus: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      expiringNext7Days: expiringCount,
      inGracePeriod: graceCount,
      monthlyRevenueINR: (monthlyRevenue._sum.amountCents || 0) / 100,
    };

    this.logger.log('Weekly Summary:', JSON.stringify(summary, null, 2));
    return summary;
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async processReferralCredits() {
    this.logger.log('Processing referral credits...');

    const clinicsWithCredits = await this.prisma.clinic.findMany({
      where: { referralCreditsMonths: { gt: 0 } },
    });

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    for (const clinic of clinicsWithCredits) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { clinicId: clinic.id },
      });

      if (
        subscription &&
        subscription.status === 'ACTIVE' &&
        subscription.currentPeriodStart > oneDayAgo
      ) {
        await this.prisma.clinic.update({
          where: { id: clinic.id },
          data: { referralCreditsMonths: { decrement: 1 } },
        });

        await this.prisma.referralCredit.updateMany({
          where: { clinicId: clinic.id, usedAt: null },
          data: { usedAt: new Date() },
        });

        this.logger.log(
          `Applied referral credit for clinic ${clinic.id}. Remaining: ${clinic.referralCreditsMonths - 1}`,
        );
      }
    }
  }

  private async sendExpirationReminder(
    subscription: any,
    config: ReminderConfig,
  ) {
    const clinic = subscription.clinic;
    const admins = clinic.users || [];

    await this.prisma.subscriptionReminder.create({
      data: {
        clinicId: subscription.clinicId,
        subscriptionId: subscription.id,
        type: config.type,
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
      },
    });

    const message = this.getExpirationMessage(
      config,
      subscription.currentPeriodEnd,
      subscription.plan,
    );

    for (const admin of admins) {
      if (admin.email) {
        this.logger.log(
          `[EMAIL] To: ${admin.email}, Subject: ${message.subject}`,
        );
      }
    }

    this.logger.log(
      `Sent ${config.type} reminder to clinic ${clinic.name} (${config.daysBeforeExpiry} days before expiry)`,
    );
  }

  private getExpirationMessage(
    config: ReminderConfig,
    expiryDate: Date,
    plan: ClinicTier,
  ) {
    const formattedDate = expiryDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    switch (config.type) {
      case 'expiry_7d':
        return {
          subject: `Your Docita ${plan} subscription expires in ${config.daysBeforeExpiry} days`,
          body: `Your subscription will expire on ${formattedDate}.`,
        };
      case 'expiry_3d':
        return {
          subject: `URGENT: Your Docita subscription expires in ${config.daysBeforeExpiry} days`,
          body: `Your subscription will expire on ${formattedDate}.`,
        };
      case 'expiry_1d':
        return {
          subject: 'FINAL NOTICE: Your Docita subscription expires TOMORROW',
          body: `Your subscription will expire TOMORROW (${formattedDate}).`,
        };
      default:
        return {
          subject: 'Your Docita subscription update',
          body: 'Your subscription status has changed.',
        };
    }
  }

  private async handleGracePeriodExpiration(subscription: any) {
    const clinic = subscription.clinic;

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'EXPIRED' },
      }),
      this.prisma.clinic.update({
        where: { id: clinic.id },
        data: { tier: 'CAPTURE', subscriptionStatus: 'expired' },
      }),
    ]);

    await this.prisma.subscriptionReminder.create({
      data: {
        clinicId: clinic.id,
        subscriptionId: subscription.id,
        type: 'downgraded',
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Clinic ${clinic.name} (${clinic.id}) has been downgraded to CAPTURE tier`,
    );
  }

  async triggerManualReminder(clinicId: string, type: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { clinicId },
      include: {
        clinic: {
          include: {
            users: {
              where: { role: 'ADMIN' },
              select: { email: true, name: true },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const config = REMINDER_SCHEDULE.find((r) => r.type === type) || {
      daysBeforeExpiry: 0,
      type,
    };

    await this.sendExpirationReminder(subscription, config);
    return { success: true, clinicId, type };
  }

  async getUpcomingExpirations(days: number = 7) {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.subscription.findMany({
      where: {
        currentPeriodEnd: { gte: now, lte: futureDate },
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      include: {
        clinic: {
          select: { id: true, name: true, email: true, tier: true },
        },
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });
  }
}
