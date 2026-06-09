import { Injectable, Logger, Inject } from '@nestjs/common';
import { InvoiceStatus, WhatsappLogStatus } from '@workspace/db';
import {
  BILLING_PERSISTENCE_PORT,
  type BillingPersistencePort,
} from '@/domains/billing/application/ports/billing-persistence.port';
import { PaymentsService } from './payments.service';
import { isClinicWhatsAppAutomationSendingAllowed } from '@/shared/whatsapp/whatsapp-patient-send-policy.util';
import {
  IInvoiceRepository,
  INVOICE_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/invoice.repository';
import {
  IPaymentSessionRepository,
  PAYMENT_SESSION_REPOSITORY_TOKEN,
} from '@/domains/billing/core/repositories/payment-session.repository';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { isRecord } from '@workspace/utils';

interface PaymentReminderConfig {
  enabled: boolean;
  days: number[];
  autoSendWhatsApp: boolean;
}

function paymentReminderLogType(dayOffset: number): string {
  return `payment_reminder_d${dayOffset}`;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(BILLING_PERSISTENCE_PORT)
    private readonly persistence: BillingPersistencePort,
    private readonly paymentsService: PaymentsService,
    @Inject(INVOICE_REPOSITORY_TOKEN)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY_TOKEN)
    private readonly sessionRepository: IPaymentSessionRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async runScheduledPaymentReminders(): Promise<void> {
    // RLS-BYPASS: billing scheduler operates without per-request clinic session
    await this.persistence.runUnrestricted(async () => {
      const clinics = await this.persistence.clinic.findMany({
        where: { active: true },
        select: {
          id: true,
          settings: true,
        },
      });

      await Promise.allSettled(
        clinics.map(async (clinic) => {
          const config = this.getReminderConfig(clinic.settings);
          if (!config.enabled || config.days.length === 0) {
            return;
          }

          const dayResults = await Promise.allSettled(
            config.days.map((dayOffset) =>
              this.processClinicDayOffset(
                clinic.id,
                dayOffset,
                config.autoSendWhatsApp,
              ),
            ),
          );
          for (const result of dayResults) {
            if (result.status === 'rejected') {
              this.logger.error(
                `Payment reminder failed for clinic ${clinic.id}`,
                result.reason,
              );
            }
          }
        }),
      );
    });
  }

  private getReminderConfig(settings: unknown): PaymentReminderConfig {
    if (!isRecord(settings)) {
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
    if (!autoSendWhatsApp) {
      return;
    }

    const { start, end } = this.getDueDateWindowForOffset(dayOffset);

    const result = await this.invoiceRepository.findAll({
      clinicId,
      status: InvoiceStatus.PENDING,
    });

    const targetInvoices = result.items.filter((invoice) => {
      if (!invoice.dueDate) return false;
      const dueDate = new Date(invoice.dueDate);
      return dueDate >= start && dueDate <= end;
    });

    if (targetInvoices.length === 0) {
      return;
    }

    const sessions = await this.sessionRepository.findPendingReminders();
    const sessionByInvoiceId = new Map(
      sessions
        .filter((session) => session.clinicId === clinicId)
        .map((session) => [session.invoiceId, session]),
    );

    const reminderType = paymentReminderLogType(dayOffset);

    await Promise.allSettled(
      targetInvoices.map(async (invoice) => {
        const session = sessionByInvoiceId.get(invoice.id);
        if (!session?.patient?.phoneNumber) {
          return;
        }

        const alreadySent = await this.persistence.whatsappLog.findFirst({
          where: {
            clinicId,
            invoiceId: invoice.id,
            type: reminderType,
          },
        });
        if (alreadySent) {
          return;
        }

        if (
          !(await isClinicWhatsAppAutomationSendingAllowed(
            this.persistence,
            session.clinicId,
          ))
        ) {
          return;
        }

        await this.paymentsService.sendPaymentReminderWhatsApp(
          session.id,
          session.clinicId,
        );

        await this.persistence.whatsappLog.create({
          data: {
            clinicId,
            invoiceId: invoice.id,
            paymentSessionId: session.id,
            patientId: session.patientId,
            type: reminderType,
            phoneNumber: session.patient.phoneNumber,
            message: `Scheduled payment reminder (${dayOffset}d after due date)`,
            status: WhatsappLogStatus.SENT,
          },
        });
      }),
    );
  }

  /** Invoices whose due date was exactly `dayOffset` calendar days ago (UTC day bounds). */
  private getDueDateWindowForOffset(dayOffset: number): {
    start: Date;
    end: Date;
  } {
    const start = this.clock.now();
    start.setDate(start.getDate() - dayOffset);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
