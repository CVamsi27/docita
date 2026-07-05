import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { InvoiceSettlementService } from './invoice-settlement.service';
import type {
  IInvoiceRepository,
  InvoiceDetail,
} from '@/domains/billing/core/repositories/invoice.repository';
import type {
  IPaymentSessionRepository,
  PaymentSessionDetail,
} from '@/domains/billing/core/repositories/payment-session.repository';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';

const NOW = new Date('2026-07-04T10:00:00.000Z');

const invoice = (overrides: Partial<InvoiceDetail> = {}): InvoiceDetail =>
  ({
    id: 'inv-1',
    patientId: 'patient-1',
    totalCents: 10000,
    status: InvoiceStatus.PENDING,
    ...overrides,
  }) as unknown as InvoiceDetail;

const settledSession = (amount: number): PaymentSessionDetail =>
  ({ status: PaymentSessionStatus.CAPTURED, amount }) as PaymentSessionDetail;

function makeCtx() {
  const invoiceRepository = {
    findById: jest
      .fn<IInvoiceRepository['findById']>()
      .mockResolvedValue(invoice()),
    update: jest
      .fn<IInvoiceRepository['update']>()
      .mockResolvedValue(invoice()),
  };
  const repository = {
    findByInvoiceId: jest
      .fn<IPaymentSessionRepository['findByInvoiceId']>()
      .mockResolvedValue([]),
    create: jest.fn<IPaymentSessionRepository['create']>(),
  };
  const configService = { getCurrencyCode: jest.fn(() => 'INR') };
  const clock: IClock = { now: () => NOW };
  const transactionRunner = {
    runInTransaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({}),
    ),
  };
  const service = new InvoiceSettlementService(
    repository as unknown as IPaymentSessionRepository,
    invoiceRepository as unknown as IInvoiceRepository,
    configService as unknown as AppConfigService,
    clock,
    transactionRunner as unknown as ITransactionRunner,
  );
  return { service, invoiceRepository, repository };
}

const manualPayload = {
  invoiceId: 'inv-1',
  clinicId: 'clinic-1',
  performedByUserId: 'user-1',
  paymentMethod: 'CASH',
};

describe('InvoiceSettlementService.markInvoicePaidManually', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound for a missing invoice', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(null);
    await expect(
      ctx.service.markInvoicePaidManually(manualPayload),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an invoice not linked to a patient', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(
      invoice({ patientId: null as unknown as string }),
    );
    await expect(
      ctx.service.markInvoicePaidManually(manualPayload),
    ).rejects.toThrow('not linked to a patient');
  });

  it('rejects settling an already-paid invoice (double-pay guard)', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(
      invoice({ status: InvoiceStatus.PAID }),
    );
    await expect(
      ctx.service.markInvoicePaidManually(manualPayload),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('rejects a payment that exceeds the outstanding balance (overpay guard)', async () => {
    await expect(
      ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 200 }),
    ).rejects.toThrow('exceeds the outstanding invoice balance');
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('settles the full balance and marks the invoice PAID', async () => {
    const result = await ctx.service.markInvoicePaidManually(manualPayload);

    expect(result).toEqual({ success: true });
    expect(ctx.repository.create).toHaveBeenCalledTimes(1);
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: 10000, status: InvoiceStatus.PAID },
      'clinic-1',
      expect.anything(),
    );
  });

  it('records a partial payment as PARTIALLY_PAID', async () => {
    await ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 50 });

    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: 5000, status: InvoiceStatus.PARTIALLY_PAID },
      'clinic-1',
      expect.anything(),
    );
  });
});

describe('InvoiceSettlementService.applyAppointmentAdvance', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  const withAdvance = (advanceAmountCents: number) =>
    invoice({
      appointment: {
        advanceAmountCents,
        advancePaymentMethod: 'CASH',
      },
    } as unknown as Partial<InvoiceDetail>);

  it('is a no-op when there is no advance to apply', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(withAdvance(0));
    await ctx.service.applyAppointmentAdvance('inv-1', 'clinic-1');
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('is idempotent when an advance session already exists', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(withAdvance(5000));
    ctx.repository.findByInvoiceId.mockResolvedValueOnce([
      {
        status: PaymentSessionStatus.CAPTURED,
        amount: 5000,
        meta: { source: 'advance' },
      } as unknown as PaymentSessionDetail,
    ]);

    await ctx.service.applyAppointmentAdvance('inv-1', 'clinic-1');

    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('applies the advance capped to the outstanding balance', async () => {
    ctx.invoiceRepository.findById.mockResolvedValueOnce(withAdvance(30000));
    ctx.repository.findByInvoiceId.mockResolvedValueOnce([
      settledSession(4000),
    ]);

    await ctx.service.applyAppointmentAdvance('inv-1', 'clinic-1');

    // balance = 10000 - 4000 = 6000; advance 30000 is capped to 6000 → PAID.
    expect(ctx.repository.create).toHaveBeenCalledTimes(1);
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: 10000, status: InvoiceStatus.PAID },
      'clinic-1',
      expect.anything(),
    );
  });
});
