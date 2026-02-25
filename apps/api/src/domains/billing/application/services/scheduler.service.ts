import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoiceStatus } from '@workspace/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '../../core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '../../core/repositories/payment-session.repository';

interface PaymentReminderConfig {
  enabled: boolean;
  days: number[];
  autoSendWhatsApp: boolean;
}

interface ClinicSettings {
  paymentReminderEnabled?: boolean;
  paymentReminderDays?: number[];
  paymentReminderAutoSendWhatsApp?: boolean;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly sessionRepository: IPaymentSessionRepository,
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
        const config = this.getReminderConfig(
          clinic.settings as ClinicSettings,
        );
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

  private getReminderConfig(
    settings: ClinicSettings | null,
  ): PaymentReminderConfig {
    if (!settings) {
      return { enabled: false, days: [], autoSendWhatsApp: true };
    }

    const rawDays = Array.isArray(settings.paymentReminderDays)
      ? settings.paymentReminderDays
      : [];

    const days = rawDays
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 1 && value <= 30)
      .sort((a, b) => a - b);

    return {
      enabled: settings.paymentReminderEnabled === true,
      days,
      autoSendWhatsApp: settings.paymentReminderAutoSendWhatsApp !== false,
    };
  }

  private async processClinicDayOffset(
    clinicId: string,
    dayOffset: number,
    autoSendWhatsApp: boolean,
  ): Promise<void> {
    const { start, end } = this.getTargetDateRange(dayOffset);

    const result = await this.invoiceRepository.findAll({
      clinicId,
      status: InvoiceStatus.PENDING,
    });

    const targetInvoices = result.items.filter((invoice) => {
      const createdAt = new Date(invoice.createdAt);
      return createdAt >= start && createdAt < end;
    });

    for (const invoice of targetInvoices) {
      if (autoSendWhatsApp) {
        const sessions = await this.sessionRepository.findPendingReminders();
        const session = sessions.find((s) => s.invoiceId === invoice.id);
        if (session) {
          await this.paymentsService.sendPaymentLinkWhatsApp(session.id);
        }
      }
    }
  }

  private getTargetDateRange(dayOffset: number): { start: Date; end: Date } {
    const start = new Date();
    start.setDate(start.getDate() - dayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
