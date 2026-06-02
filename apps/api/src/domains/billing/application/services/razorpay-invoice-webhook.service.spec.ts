import { describe, expect, it, jest } from '@jest/globals';
import type { Prisma } from '@workspace/db';
import type { PaymentWebhookPayload } from '@workspace/types';
import type { IInvoiceRepository } from '@/domains/billing/core/repositories/invoice.repository';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import type { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';

describe('RazorpayInvoiceWebhookService', () => {
  it('appends payment capture to the outbox inside the invoice transaction', async () => {
    const tx: Prisma.TransactionClient = Object.create(null);
    const session = {
      id: 'session-1',
      clinicId: 'clinic-1',
      invoiceId: 'invoice-1',
      patientId: 'patient-1',
    };
    const repository: IPaymentSessionRepository = Object.assign(
      Object.create(null),
      {
        findByProviderPaymentId: jest.fn(async () => null),
        findByProviderSessionId: jest.fn(async () => session),
        update: jest.fn(async () => Object.create(null)),
      },
    );
    const invoiceRepository: IInvoiceRepository = Object.assign(
      Object.create(null),
      {
        update: jest.fn(async () => Object.create(null)),
      },
    );
    const transactionRunner: ITransactionRunner = {
      runInTransaction: async (fn) => fn(tx),
    };
    const outbox: IOutboxService = {
      append: jest.fn(async () => undefined),
    };
    const payload: PaymentWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'payment-1',
            amount: 12500,
            currency: 'INR',
            status: 'captured',
            order_id: 'order-1',
          },
        },
      },
    };
    const service = new RazorpayInvoiceWebhookService(
      repository,
      invoiceRepository,
      transactionRunner,
      { now: () => new Date('2026-06-01T00:00:00.000Z') },
      outbox,
    );

    await service.handle(payload, 'signature');

    expect(repository.update).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ providerPaymentId: 'payment-1' }),
      'clinic-1',
      tx,
    );
    expect(invoiceRepository.update).toHaveBeenCalledWith(
      'invoice-1',
      expect.any(Object),
      'clinic-1',
      tx,
    );
    expect(outbox.append).toHaveBeenCalledWith(tx, {
      eventName: ApplicationEvents.PAYMENT_CAPTURED,
      aggregateType: 'Invoice',
      aggregateId: 'invoice-1',
      clinicId: 'clinic-1',
      idempotencyKey: 'payment-captured:payment-1',
      payload: {
        invoiceId: 'invoice-1',
        clinicId: 'clinic-1',
        providerPaymentId: 'payment-1',
        amountPaise: 12500,
      },
    });
  });
});
