import { describe, expect, it, jest } from '@jest/globals';
import type { IPaymentSessionRepository } from '@/domains/billing/core/repositories/payment-session.repository';
import type { IOrderProvider } from '@/domains/payments/core/ports/order-provider.port';
import { Money } from '@/domains/payments/core/value-objects/money.vo';
import type { RazorpayInvoiceWebhookService } from './razorpay-invoice-webhook.service';
import { PaymentCaptureReconciliationService } from './payment-capture-reconciliation.service';

const CLOCK = { now: () => new Date('2026-06-01T12:00:00.000Z') };

const SESSION = {
  id: 'session-1',
  clinicId: 'clinic-1',
  invoiceId: 'invoice-1',
  patientId: 'patient-1',
  providerSessionId: 'order-1',
  amount: 12500,
  currency: 'INR',
};

function capturedPayment(id = 'payment-1', amountCents = 12500) {
  return {
    id,
    orderId: 'order-1',
    amount: Money.fromCents(amountCents, 'INR'),
    status: 'captured',
    method: 'upi',
  };
}

function buildService(options: {
  candidates?: unknown[];
  payments?: unknown[];
  applied?: boolean;
  applyError?: Error;
}) {
  const repository = {
    findReconciliationCandidates: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(options.candidates ?? [{ ...SESSION }]),
  };
  const orderProvider = {
    listOrderPayments: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(options.payments ?? [capturedPayment()]),
  };
  const webhookService = {
    applyReconciledCapture: jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockImplementation(async () => {
        if (options.applyError) throw options.applyError;
        return options.applied ?? true;
      }),
  };

  const service = new PaymentCaptureReconciliationService(
    repository as unknown as IPaymentSessionRepository,
    orderProvider as unknown as IOrderProvider,
    webhookService as unknown as RazorpayInvoiceWebhookService,
    CLOCK,
  );

  return { service, repository, orderProvider, webhookService };
}

describe('PaymentCaptureReconciliationService', () => {
  it('applies a captured provider payment through the webhook claim', async () => {
    const { service, orderProvider, webhookService } = buildService({});

    const summary = await service.reconcileRecentCaptures();

    expect(orderProvider.listOrderPayments).toHaveBeenCalledWith('order-1');
    expect(webhookService.applyReconciledCapture).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-1' }),
      {
        providerPaymentId: 'payment-1',
        amountPaise: 12500,
        currency: 'INR',
      },
    );
    expect(summary).toEqual({
      scanned: 1,
      captured: 1,
      alreadyCaptured: 0,
      unmatched: 0,
      failed: 0,
    });
  });

  it('counts a session the webhook already captured without re-applying', async () => {
    const { service } = buildService({ applied: false });

    const summary = await service.reconcileRecentCaptures();

    expect(summary.alreadyCaptured).toBe(1);
    expect(summary.captured).toBe(0);
  });

  it('treats an order without a captured payment as unmatched', async () => {
    const { service, webhookService } = buildService({
      payments: [
        {
          ...capturedPayment(),
          status: 'authorized',
        },
      ],
    });

    const summary = await service.reconcileRecentCaptures();

    expect(webhookService.applyReconciledCapture).not.toHaveBeenCalled();
    expect(summary.unmatched).toBe(1);
  });

  it('continues to the next session when one capture fails', async () => {
    const { service } = buildService({
      candidates: [
        { ...SESSION, id: 'session-1' },
        { ...SESSION, id: 'session-2', providerSessionId: 'order-2' },
      ],
      applyError: new Error('amount mismatch'),
    });

    const summary = await service.reconcileRecentCaptures();

    expect(summary.scanned).toBe(2);
    expect(summary.failed).toBe(2);
    expect(summary.captured).toBe(0);
  });

  it('does not fail the run when the provider returns no payments', async () => {
    const { service } = buildService({ payments: [] });

    const summary = await service.reconcileRecentCaptures();

    expect(summary.unmatched).toBe(1);
    expect(summary.failed).toBe(0);
  });
});
