import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from './payments.service';

interface PaymentReminderConfig {
  enabled: boolean;
  days: number[];
  autoSendWhatsApp: boolean;
}

@Injectable()
export class PaymentReminderSchedulerService {
  private readonly logger = new Logger(PaymentReminderSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runScheduledPaymentReminders(): Promise<void> {
    await this.prisma.runUnrestricted(async () => {
      const clinics = await this.prisma.clinic.findMany({
        where: { active: true },
        select: {
          id: true,
          settings: true,
        },
      });

      for (const clinic of clinics) {
        const config = this.getReminderConfig(clinic.settings);
        if (!config.enabled || config.days.length === 0) {
          continue;
        }

        for (const dayOffset of config.days) {
          await this.processClinicDayOffset(
            clinic.id,
            dayOffset,
            config.autoSendWhatsApp,
          );
        }
      }
    });
  }

  private getReminderConfig(settings: unknown): PaymentReminderConfig {
    if (!settings || typeof settings !== 'object') {
      return { enabled: false, days: [], autoSendWhatsApp: true };
    }

    const typedSettings = settings as Record<string, unknown>;
    const rawDays = Array.isArray(typedSettings.paymentReminderDays)
      ? typedSettings.paymentReminderDays
      : [];

    const days = rawDays
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 30)
      .sort((left, right) => left - right);

    return {
      enabled: typedSettings.paymentReminderEnabled === true,
      days,
      autoSendWhatsApp: typedSettings.paymentReminderAutoSendWhatsApp !== false,
    };
  }

  private async processClinicDayOffset(
    clinicId: string,
    dayOffset: number,
    autoSendWhatsApp: boolean,
  ): Promise<void> {
    const { start, end } = this.getTargetDateRange(dayOffset);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PENDING,
        createdAt: {
          gte: start,
          lt: end,
        },
        patient: {
          clinicId,
        },
      },
      select: {
        id: true,
        total: true,
        patientId: true,
        patient: {
          select: {
            phoneNumber: true,
          },
        },
      },
    });

    for (const invoice of invoices) {
      try {
        if (!invoice.patient?.phoneNumber) {
          continue;
        }

        if (await this.hasPaidSession(invoice.id)) {
          continue;
        }

        if (await this.hasReminderSessionToday(invoice.id)) {
          continue;
        }

        const existingSession = await this.findReusableSession(invoice.id);

        if (existingSession) {
          if (autoSendWhatsApp) {
            await this.paymentsService.sendPaymentLinkWhatsApp(
              existingSession.id,
            );
          }
          continue;
        }

        await this.paymentsService.createPaymentLink({
          invoiceId: invoice.id,
          amount: invoice.total,
          currency: 'INR',
          patientId: invoice.patientId,
          clinicId,
          paymentMode: 'ONLINE',
          sendWhatsApp: autoSendWhatsApp,
          description: `Payment reminder for invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed scheduled payment reminder for invoice ${invoice.id} (clinic: ${clinicId})`,
          error,
        );
      }
    }
  }

  private getTargetDateRange(dayOffset: number): { start: Date; end: Date } {
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() - dayOffset);

    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
  }

  private async hasPaidSession(invoiceId: string): Promise<boolean> {
    const paidSession = await this.prisma.paymentSession.findFirst({
      where: {
        invoiceId,
        status: PaymentSessionStatus.PAID,
      },
      select: { id: true },
    });

    return !!paidSession;
  }

  private async hasReminderSessionToday(invoiceId: string): Promise<boolean> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const session = await this.prisma.paymentSession.findFirst({
      where: {
        invoiceId,
        provider: 'razorpay',
        createdAt: {
          gte: startOfToday,
        },
      },
      select: { id: true },
    });

    return !!session;
  }

  private async findReusableSession(invoiceId: string) {
    return this.prisma.paymentSession.findFirst({
      where: {
        invoiceId,
        provider: 'razorpay',
        status: {
          in: [PaymentSessionStatus.CREATED, PaymentSessionStatus.PENDING],
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
      },
    });
  }
}
