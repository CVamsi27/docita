import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InvoiceStatus } from '@workspace/db';
import { SchedulerService } from './scheduler.service';
import type { BillingPersistencePort } from '@/domains/billing/application/ports/billing-persistence.port';
import type { PaymentsService } from './payments.service';
import type {
  IInvoiceRepository,
  InvoiceListItem,
} from '@/domains/billing/core/repositories/invoice.repository';
import type {
  IPaymentSessionRepository,
  PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import type { IClock } from '@/shared/common/ports/clock.port';
import * as whatsappPolicy from '@/shared/whatsapp/whatsapp-patient-send-policy.util';

describe('SchedulerService', () => {
  const now = new Date('2026-05-29T12:00:00.000Z');

  let persistence: BillingPersistencePort;
  let paymentsService: Pick<PaymentsService, 'sendPaymentReminderWhatsApp'>;
  let invoiceRepository: Pick<IInvoiceRepository, 'findAll'>;
  let sessionRepository: Pick<
    IPaymentSessionRepository,
    'findPendingReminders'
  >;
  let clock: IClock;
  let service: SchedulerService;

  beforeEach(() => {
    jest
      .spyOn(whatsappPolicy, 'isClinicWhatsAppAutomationSendingAllowed')
      .mockResolvedValue(true);

    persistence = {
      runUnrestricted: jest.fn(async (fn: () => Promise<void>) =>
        fn(),
      ) as BillingPersistencePort['runUnrestricted'],
      clinic: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'clinic_1',
            settings: {
              paymentReminderEnabled: true,
              paymentReminderDays: [1, 3, 7],
              paymentReminderAutoSendWhatsApp: true,
            },
          },
        ] as never),
      },
      whatsappLog: {
        findFirst: jest.fn().mockResolvedValue(null as never),
        create: jest.fn().mockResolvedValue({ id: 'log_1' } as never),
      },
    } as unknown as BillingPersistencePort;

    paymentsService = {
      sendPaymentReminderWhatsApp: jest
        .fn<PaymentsService['sendPaymentReminderWhatsApp']>()
        .mockResolvedValue(undefined),
    };

    invoiceRepository = {
      findAll: jest.fn<IInvoiceRepository['findAll']>().mockResolvedValue({
        items: [
          {
            id: 'inv_due_yesterday',
            clinicId: 'clinic_1',
            dueDate: new Date('2026-05-28T10:00:00.000Z'),
            status: InvoiceStatus.PENDING,
            createdAt: new Date('2026-05-20T10:00:00.000Z'),
          },
          {
            id: 'inv_created_yesterday',
            clinicId: 'clinic_1',
            dueDate: new Date('2026-06-15T10:00:00.000Z'),
            status: InvoiceStatus.PENDING,
            createdAt: new Date('2026-05-28T10:00:00.000Z'),
          },
        ] as InvoiceListItem[],
        hasMore: false,
        count: 2,
      }),
    };

    sessionRepository = {
      findPendingReminders: jest
        .fn<IPaymentSessionRepository['findPendingReminders']>()
        .mockResolvedValue([
          {
            id: 'sess_1',
            clinicId: 'clinic_1',
            invoiceId: 'inv_due_yesterday',
            patientId: 'pat_1',
            patient: {
              firstName: 'Ada',
              lastName: 'Lovelace',
              phoneNumber: '+919999999999',
              email: null,
            },
          },
        ] as PaymentSessionDetail[]),
    };

    clock = { now: jest.fn(() => new Date(now)) };

    service = new SchedulerService(
      persistence,
      paymentsService as PaymentsService,
      invoiceRepository as IInvoiceRepository,
      sessionRepository as IPaymentSessionRepository,
      clock,
    );
  });

  it('sends payment_reminder for invoices due on the offset day, not by createdAt', async () => {
    await service.runScheduledPaymentReminders();

    expect(paymentsService.sendPaymentReminderWhatsApp).toHaveBeenCalledTimes(
      1,
    );
    expect(paymentsService.sendPaymentReminderWhatsApp).toHaveBeenCalledWith(
      'sess_1',
      'clinic_1',
    );
    expect(persistence.whatsappLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: 'inv_due_yesterday',
          type: 'payment_reminder_d1',
        }),
      }),
    );
  });

  it('skips clinics with payment reminders disabled', async () => {
    jest.mocked(persistence.clinic.findMany).mockResolvedValue([
      {
        id: 'clinic_1',
        settings: { paymentReminderEnabled: false, paymentReminderDays: [1] },
      },
    ] as never);

    await service.runScheduledPaymentReminders();

    expect(paymentsService.sendPaymentReminderWhatsApp).not.toHaveBeenCalled();
  });
});
