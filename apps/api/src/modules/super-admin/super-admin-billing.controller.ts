import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Helper function to subtract days from date
function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Helper function to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to get start of month
function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

// Helper function to format date
function formatDate(date: Date, pattern: string): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  if (pattern === 'MMM yyyy') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  return date.toISOString();
}

@Controller('super-admin/billing')
@ApiTags('Super Admin - Billing')
@ApiBearerAuth()
export class SuperAdminBillingController {
  constructor(private prisma: PrismaService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get billing metrics overview' })
  async getMetrics() {
    // Get all subscriptions with clinic info
    const subscriptions = await this.prisma.subscription.findMany({
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
    });

    // Calculate MRR from active subscriptions
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'TRIALING',
    );

    const mrr = activeSubscriptions.reduce((sum, s) => {
      const monthlyAmount =
        s.billingCycle === 'YEARLY' ? s.priceCents / 12 : s.priceCents;
      return sum + monthlyAmount;
    }, 0);

    const arr = mrr * 12;

    // Get churn rate (cancelled in last 30 days / total active at start)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const cancelledRecently = subscriptions.filter(
      (s) => s.status === 'CANCELLED' && new Date(s.updatedAt) > thirtyDaysAgo,
    ).length;

    const totalActive = activeSubscriptions.length;
    const churnRate =
      totalActive > 0
        ? cancelledRecently / (totalActive + cancelledRecently)
        : 0;

    // Subscriptions by tier (plan)
    const subscriptionsByTier = subscriptions.reduce(
      (acc, s) => {
        acc[s.plan] = (acc[s.plan] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Subscriptions by status
    const subscriptionsByStatus = subscriptions.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Expiring in next 7 days
    const sevenDaysFromNow = addDays(new Date(), 7);
    const expiringSubscriptions = subscriptions
      .filter(
        (s) =>
          (s.status === 'ACTIVE' || s.status === 'TRIALING') &&
          new Date(s.currentPeriodEnd) <= sevenDaysFromNow &&
          new Date(s.currentPeriodEnd) > new Date(),
      )
      .map((s) => ({
        id: s.id,
        clinicId: s.clinicId,
        tier: s.plan,
        status: s.status,
        billingCycle: s.billingCycle,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        amount: s.priceCents / 100, // Convert to rupees
        currency: s.currency,
        clinic: s.clinic,
      }));

    // Grace period subscriptions
    const gracePeriodSubscriptions = subscriptions
      .filter((s) => s.status === 'GRACE')
      .map((s) => ({
        id: s.id,
        clinicId: s.clinicId,
        tier: s.plan,
        status: s.status,
        billingCycle: s.billingCycle,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        amount: s.priceCents / 100,
        currency: s.currency,
        clinic: s.clinic,
      }));

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subDays(new Date(), i * 30));
      const monthEnd = startOfMonth(subDays(new Date(), (i - 1) * 30));

      const payments = await this.prisma.subscriptionPayment.findMany({
        where: {
          status: 'paid',
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      const revenue = payments.reduce((sum, p) => sum + p.amountCents, 0);
      revenueByMonth.push({
        month: formatDate(monthStart, 'MMM yyyy'),
        revenue: revenue / 100, // Convert to rupees
      });
    }

    // Recent payments
    const recentPayments = await this.prisma.subscriptionPayment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      mrr: mrr / 100, // Convert to rupees
      arr: arr / 100,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: subscriptions.filter((s) => s.status === 'TRIALING')
        .length,
      churnRate,
      subscriptionsByTier,
      subscriptionsByStatus,
      expiringSubscriptions,
      gracePeriodSubscriptions,
      revenueByMonth,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        subscriptionId: p.subscriptionId,
        amount: p.amountCents / 100,
        currency: p.currency,
        status: p.status,
        gatewayPaymentId: p.razorpayPaymentId,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        subscription: p.subscription
          ? {
              clinic: p.subscription.clinic,
              tier: p.subscription.plan,
            }
          : null,
      })),
    };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions with filters' })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'billingCycle', required: false })
  async getSubscriptions(
    @Query('tier') tier?: string,
    @Query('status') status?: string,
    @Query('billingCycle') billingCycle?: string,
  ) {
    const where: any = {};
    if (tier) where.plan = tier;
    if (status) where.status = status;
    if (billingCycle) where.billingCycle = billingCycle;

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      clinicId: s.clinicId,
      tier: s.plan,
      status: s.status,
      billingCycle: s.billingCycle,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      amount: s.priceCents / 100,
      currency: s.currency,
      clinic: s.clinic,
    }));
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get subscriptions expiring soon' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getExpiringSubscriptions(@Query('days') days?: number) {
    const daysToCheck = days || 7;
    const futureDate = addDays(new Date(), daysToCheck);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIALING'] },
        currentPeriodEnd: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
            referralCreditsMonths: true,
          },
        },
      },
      orderBy: { currentPeriodEnd: 'asc' },
    });

    return subscriptions.map((s) => ({
      id: s.id,
      clinicId: s.clinicId,
      tier: s.plan,
      status: s.status,
      billingCycle: s.billingCycle,
      currentPeriodStart: s.currentPeriodStart,
      currentPeriodEnd: s.currentPeriodEnd,
      amount: s.priceCents / 100,
      currency: s.currency,
      clinic: s.clinic,
    }));
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'clinicId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPayments(
    @Query('clinicId') clinicId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const where: any = {};

    if (clinicId) {
      where.clinicId = clinicId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await this.prisma.subscriptionPayment.findMany({
      where,
      include: {
        subscription: {
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return payments.map((p) => ({
      id: p.id,
      subscriptionId: p.subscriptionId,
      amount: p.amountCents / 100,
      currency: p.currency,
      status: p.status,
      gatewayPaymentId: p.razorpayPaymentId,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      subscription: p.subscription
        ? {
            clinic: p.subscription.clinic,
            tier: p.subscription.plan,
          }
        : null,
    }));
  }

  @Post('subscriptions/:subscriptionId/remind')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send reminder to subscription owner' })
  async sendReminder(@Param('subscriptionId') subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    // Create a reminder record
    await this.prisma.subscriptionReminder.create({
      data: {
        clinicId: subscription.clinicId,
        subscriptionId,
        type: 'expiry_7d',
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return { success: true, message: 'Reminder sent successfully' };
  }

  @Post('subscriptions/:subscriptionId/extend-grace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend grace period for a subscription' })
  async extendGracePeriod(
    @Param('subscriptionId') subscriptionId: string,
    @Body() body: { days: number },
  ) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return { success: false, message: 'Subscription not found' };
    }

    if (subscription.status !== 'GRACE') {
      return { success: false, message: 'Subscription is not in grace period' };
    }

    const newEndDate = addDays(
      new Date(subscription.currentPeriodEnd),
      body.days,
    );

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodEnd: newEndDate,
      },
    });

    return {
      success: true,
      message: `Grace period extended by ${body.days} days`,
    };
  }
}
