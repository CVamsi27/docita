import { describe, expect, it, jest } from '@jest/globals';
import type { PaymentWebhookPayload } from '@workspace/types';
import type { IInvoiceRepository } from '@/domains/billing/core/repositories/invoice.repository';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import type { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';

describe('RazorpayInvoiceWebhookService', () => {
  it('appends payment capture to the outbox inside the invoice transaction', async () => {
    const tx = Object.create(null);
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

  it('is a no-op when the same payment has already been captured (idempotency)', async () => {
    const existingSession = {
      id: 'session-1',
      clinicId: 'clinic-1',
      providerPaymentId: 'payment-1',
    };
    const repository: IPaymentSessionRepository = Object.assign(
      Object.create(null),
      {
        findByProviderPaymentId: jest.fn(async () => existingSession),
        update: jest.fn(async () => Object.create(null)),
      },
    );
    const invoiceRepository: IInvoiceRepository = Object.assign(
      Object.create(null),
      { update: jest.fn(async () => Object.create(null)) },
    );
    const outbox: IOutboxService = {
      append: jest.fn(async () => undefined),
    };
    const service = new RazorpayInvoiceWebhookService(
      repository,
      invoiceRepository,
      { runInTransaction: async (fn) => fn(Object.create(null)) },
      { now: () => new Date('2026-06-01T00:00:00.000Z') },
      outbox,
    );

    const result = await service.handle(
      {
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
      },
      'signature',
    );

    expect(result).toEqual({ status: 'ok' });
    expect(invoiceRepository.update).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('throws 400 when the payment cannot be matched to a session', async () => {
    const repository: IPaymentSessionRepository = Object.assign(
      Object.create(null),
      {
        findByProviderPaymentId: jest.fn(async () => null),
        findByProviderSessionId: jest.fn(async () => null),
      },
    );
    const service = new RazorpayInvoiceWebhookService(
      repository,
      Object.assign(Object.create(null), {
        update: jest.fn(async () => Object.create(null)),
      }),
      { runInTransaction: async (fn) => fn(Object.create(null)) },
      { now: () => new Date('2026-06-01T00:00:00.000Z') },
      { append: jest.fn(async () => undefined) },
    );

    await expect(
      service.handle(
        {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'orphan-payment',
                amount: 100,
                currency: 'INR',
                status: 'captured',
                order_id: 'order-orphan',
              },
            },
          },
        },
        'signature',
      ),
    ).rejects.toThrow(/matched to a payment session/);
  });

  it('handles payment_link.paid by capturing the linked invoice', async () => {
    const session = {
      id: 'session-link-1',
      clinicId: 'clinic-1',
      invoiceId: 'invoice-link-1',
      patientId: 'patient-1',
    };
    const repository: IPaymentSessionRepository = Object.assign(
      Object.create(null),
      {
        findByProviderSessionId: jest.fn(async () => session),
        update: jest.fn(async () => Object.create(null)),
      },
    );
    const invoiceRepository: IInvoiceRepository = Object.assign(
      Object.create(null),
      { update: jest.fn(async () => Object.create(null)) },
    );
    const outbox: IOutboxService = {
      append: jest.fn(async () => undefined),
    };
    const service = new RazorpayInvoiceWebhookService(
      repository,
      invoiceRepository,
      { runInTransaction: async (fn) => fn(Object.create(null)) },
      { now: () => new Date('2026-06-01T00:00:00.000Z') },
      outbox,
    );

    const result = await service.handle(
      {
        event: 'payment_link.paid',
        payload: {
          payment_link: {
            entity: {
              id: 'link-1',
              amount: 5000,
              status: 'paid',
            },
          },
        },
      },
      'signature',
    );

    expect(result).toEqual({ status: 'ok' });
    expect(repository.update).toHaveBeenCalledWith(
      'session-link-1',
      expect.objectContaining({ providerPaymentId: 'payment_link:link-1' }),
      'clinic-1',
      expect.anything(),
    );
    expect(outbox.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        idempotencyKey: 'payment-captured:payment_link:link-1',
      }),
    );
  });

  it('returns status:ignored for events outside the supported set', async () => {
    const outbox: IOutboxService = {
      append: jest.fn(async () => undefined),
    };
    const service = new RazorpayInvoiceWebhookService(
      Object.assign(Object.create(null), {
        findByProviderPaymentId: jest.fn(async () => null),
        findByProviderSessionId: jest.fn(async () => null),
        update: jest.fn(async () => Object.create(null)),
      }),
      Object.assign(Object.create(null), {
        update: jest.fn(async () => Object.create(null)),
      }),
      { runInTransaction: async (fn) => fn(Object.create(null)) },
      { now: () => new Date() },
      outbox,
    );

    const result = await service.handle(
      { event: 'refund.processed', payload: {} as never },
      'signature',
    );

    expect(result).toEqual({ status: 'ignored' });
    expect(outbox.append).not.toHaveBeenCalled();
  });
});
