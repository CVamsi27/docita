import { describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import type { PaymentWebhookPayload } from '@workspace/types';
import type { IInvoiceRepository } from '@/domains/billing/core/repositories/invoice.repository';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import type { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';
import type { IOutboxService } from '@/shared/modules/outbox/outbox.interface';
import { ApplicationEvents } from '@/shared/common/events/application-events';
import { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';

const CLOCK = { now: () => new Date('2026-06-01T00:00:00.000Z') };

const SESSION = {
  id: 'session-1',
  clinicId: 'clinic-1',
  invoiceId: 'invoice-1',
  patientId: 'patient-1',
  providerSessionId: 'order-1',
  amount: 12500,
  currency: 'INR',
};

function paymentCapturedPayload(amount = 12500): PaymentWebhookPayload {
  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'payment-1',
          amount,
          currency: 'INR',
          status: 'captured',
          order_id: 'order-1',
        },
      },
    },
  };
}

function paymentLinkPaidPayload(
  overrides: Record<string, unknown> = {},
): PaymentWebhookPayload {
  return {
    event: 'payment_link.paid',
    payload: {
      payment_link: {
        entity: { id: 'link-1', amount: 5000, status: 'paid', ...overrides },
      },
    },
  };
}

function buildService(
  options: {
    existingPayment?: unknown;
    session?: unknown;
    capturedClaim?: boolean;
  } = {},
) {
  const sessionValue =
    options.session !== undefined ? options.session : { ...SESSION };
  const repository = {
    findByProviderPaymentId: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(options.existingPayment ?? null),
    findByProviderSessionId: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(sessionValue),
    tryMarkCaptured: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(options.capturedClaim ?? true),
  };
  const invoiceRepository = {
    update: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(Object.create(null)),
  };
  const outbox = {
    append: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(undefined),
  };
  const tx = Object.create(null);
  const transactionRunner: ITransactionRunner = {
    runInTransaction: async (fn) => fn(tx),
  };

  const service = new RazorpayInvoiceWebhookService(
    repository as unknown as IPaymentSessionRepository,
    invoiceRepository as unknown as IInvoiceRepository,
    transactionRunner,
    CLOCK,
    outbox as unknown as IOutboxService,
  );

  return { service, repository, invoiceRepository, outbox, tx };
}

describe('RazorpayInvoiceWebhookService', () => {
  it('claims the session and appends payment capture to the outbox inside the invoice transaction', async () => {
    const { service, repository, invoiceRepository, outbox, tx } =
      buildService();

    await service.handle(paymentCapturedPayload(), 'signature');

    expect(repository.tryMarkCaptured).toHaveBeenCalledWith(
      'session-1',
      'clinic-1',
      expect.objectContaining({
        status: 'CAPTURED',
        providerPaymentId: 'payment-1',
        amount: 12500,
      }),
      tx,
    );
    expect(invoiceRepository.update).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ status: 'PAID' }),
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
    const { service, repository, invoiceRepository, outbox } = buildService({
      existingPayment: { id: 'session-1', providerPaymentId: 'payment-1' },
    });

    const result = await service.handle(paymentCapturedPayload(), 'signature');

    expect(result).toEqual({ status: 'ok' });
    expect(repository.tryMarkCaptured).not.toHaveBeenCalled();
    expect(invoiceRepository.update).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('does not publish a second effect when the atomic claim is lost', async () => {
    const { service, invoiceRepository, outbox } = buildService({
      capturedClaim: false,
    });

    const result = await service.handle(paymentCapturedPayload(), 'signature');

    expect(result).toEqual({ status: 'ok' });
    expect(invoiceRepository.update).not.toHaveBeenCalled();
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('rejects a capture whose amount does not match the session (wrong context)', async () => {
    const { service, repository, invoiceRepository } = buildService();

    await expect(
      service.handle(paymentCapturedPayload(999), 'signature'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.tryMarkCaptured).not.toHaveBeenCalled();
    expect(invoiceRepository.update).not.toHaveBeenCalled();
  });

  it('throws 400 when the payment cannot be matched to a session', async () => {
    const { service } = buildService({ session: null });

    await expect(
      service.handle(paymentCapturedPayload(), 'signature'),
    ).rejects.toThrow(/matched to a payment session/);
  });

  it('throws 400 when payment.captured has no payment entity', async () => {
    const { service } = buildService();

    await expect(
      service.handle(
        { event: 'payment.captured', payload: { payment: {} } } as never,
        'signature',
      ),
    ).rejects.toThrow(/payment payload is missing/);
  });

  it('handles payment_link.paid by capturing the linked invoice', async () => {
    const { service, repository, outbox, tx } = buildService({
      session: { ...SESSION, amount: 5000 },
    });

    const result = await service.handle(paymentLinkPaidPayload(), 'signature');

    expect(result).toEqual({ status: 'ok' });
    expect(repository.tryMarkCaptured).toHaveBeenCalledWith(
      'session-1',
      'clinic-1',
      expect.objectContaining({ providerPaymentId: 'payment_link:link-1' }),
      tx,
    );
    expect(outbox.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        idempotencyKey: 'payment-captured:payment_link:link-1',
      }),
    );
  });

  it('ignores a duplicate payment_link.paid beyond the ingress replay window', async () => {
    const { service, repository, invoiceRepository } = buildService({
      existingPayment: {
        id: 'session-1',
        providerPaymentId: 'payment_link:link-1',
      },
      session: { ...SESSION, amount: 5000 },
    });

    const result = await service.handle(paymentLinkPaidPayload(), 'signature');

    expect(result).toEqual({ status: 'ok' });
    expect(repository.findByProviderPaymentId).toHaveBeenCalledWith(
      'razorpay',
      'payment_link:link-1',
    );
    expect(repository.tryMarkCaptured).not.toHaveBeenCalled();
    expect(invoiceRepository.update).not.toHaveBeenCalled();
  });

  it('throws 400 when payment_link.paid has no payment_link entity', async () => {
    const { service } = buildService();

    await expect(
      service.handle(
        { event: 'payment_link.paid', payload: { payment_link: {} } } as never,
        'signature',
      ),
    ).rejects.toThrow(/payment link payload is missing/);
  });

  it('throws 400 when payment_link.paid cannot be matched to a session', async () => {
    const { service } = buildService({ session: null });

    await expect(
      service.handle(paymentLinkPaidPayload(), 'signature'),
    ).rejects.toThrow(/could not be matched to a payment session/);
  });

  it('throws 400 when a matched session is not linked to an invoice', async () => {
    const { service } = buildService({
      session: { ...SESSION, invoiceId: null },
    });

    await expect(
      service.handle(paymentLinkPaidPayload(), 'signature'),
    ).rejects.toThrow(/could not be matched to a payment session/);
  });

  it('returns status:ignored for events outside the supported set', async () => {
    const { service, outbox } = buildService();

    const result = await service.handle(
      { event: 'refund.processed', payload: {} } as never,
      'signature',
    );

    expect(result).toEqual({ status: 'ignored' });
    expect(outbox.append).not.toHaveBeenCalled();
  });

  it('applies a reconciled capture through the same atomic claim', async () => {
    const { service, repository, invoiceRepository, outbox, tx } =
      buildService();

    const applied = await service.applyReconciledCapture(SESSION, {
      providerPaymentId: 'payment-reconciled-1',
      amountPaise: 12500,
      currency: 'INR',
    });

    expect(applied).toBe(true);
    expect(repository.tryMarkCaptured).toHaveBeenCalledWith(
      'session-1',
      'clinic-1',
      expect.objectContaining({
        providerPaymentId: 'payment-reconciled-1',
        webhookPayload: expect.objectContaining({
          event: 'reconciliation.payment_captured',
        }),
      }),
      tx,
    );
    expect(invoiceRepository.update).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ status: 'PAID' }),
      'clinic-1',
      tx,
    );
    expect(outbox.append).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        idempotencyKey: 'payment-captured:payment-reconciled-1',
      }),
    );
  });

  it('reports no new effect when reconciliation loses the claim to a webhook', async () => {
    const { service, invoiceRepository } = buildService({
      capturedClaim: false,
    });

    const applied = await service.applyReconciledCapture(SESSION, {
      providerPaymentId: 'payment-reconciled-1',
      amountPaise: 12500,
      currency: 'INR',
    });

    expect(applied).toBe(false);
    expect(invoiceRepository.update).not.toHaveBeenCalled();
  });
});
