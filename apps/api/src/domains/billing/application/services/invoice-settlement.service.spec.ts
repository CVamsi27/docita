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
import type { IClock } from '@/shared/common/ports/clock.port';
import type { ITransactionRunner } from '@/shared/common/ports/transaction-runner.port';

const NOW = new Date('2026-07-04T10:00:00.000Z');

const invoice = (overrides: Partial<InvoiceDetail> = {}): InvoiceDetail =>
  ({
    id: 'inv-1',
    patientId: 'patient-1',
    currency: 'INR',
    totalCents: 10000,
    status: InvoiceStatus.PENDING,
    ...overrides,
  }) as unknown as InvoiceDetail;

const settledSession = (amount: number): PaymentSessionDetail =>
  ({ status: PaymentSessionStatus.CAPTURED, amount }) as PaymentSessionDetail;

function makeCtx() {
  const dbState = { ...invoice(), amountPaidCents: 0 };
  const invoiceRepository = {
    findById: jest
      .fn<IInvoiceRepository['findById']>()
      .mockResolvedValue(invoice()),
    update: jest
      .fn<IInvoiceRepository['update']>()
      .mockImplementation(
        async (_id: string, data: Record<string, unknown>) => {
          const increment = (
            (data.amountPaidCents ?? {}) as { increment?: number }
          ).increment;
          if (typeof increment === 'number') {
            dbState.amountPaidCents += increment;
          }
          if (data.status !== undefined) {
            dbState.status = data.status as InvoiceStatus;
          }
          return { ...dbState };
        },
      ),
  };
  const repository = {
    findByInvoiceId: jest
      .fn<IPaymentSessionRepository['findByInvoiceId']>()
      .mockResolvedValue([]),
    create: jest.fn<IPaymentSessionRepository['create']>(),
  };
  const clock: IClock = { now: () => NOW };
  const transactionRunner = {
    runInTransaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({}),
    ),
  };
  const service = new InvoiceSettlementService(
    repository as unknown as IPaymentSessionRepository,
    invoiceRepository as unknown as IInvoiceRepository,
    clock,
    transactionRunner as unknown as ITransactionRunner,
  );
  return { service, invoiceRepository, repository, dbState };
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

  it('refuses a zero-total invoice instead of recording an empty CAPTURED session', async () => {
    // Fully discounted / zero-priced line items net the invoice to Rs 0. The
    // old `balance || invoiceTotal` fallback resolved 0 to a falsy value and
    // settled 0 paise, appending an endless run of empty payment rows.
    ctx.invoiceRepository.findById.mockResolvedValueOnce(
      invoice({ totalCents: 0 }),
    );

    await expect(
      ctx.service.markInvoicePaidManually(manualPayload),
    ).rejects.toThrow('no outstanding balance');
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('refuses a nil balance instead of reporting a phantom overpayment', async () => {
    // Settled sessions already cover the total but the status has not been
    // re-derived (e.g. the total was lowered by a later invoice edit).
    ctx.repository.findByInvoiceId.mockResolvedValueOnce([
      settledSession(10000),
    ]);
    ctx.invoiceRepository.findById.mockResolvedValueOnce(
      invoice({ status: InvoiceStatus.PARTIALLY_PAID }),
    );

    await expect(
      ctx.service.markInvoicePaidManually(manualPayload),
    ).rejects.toThrow('no outstanding balance');
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('refuses an explicit zero amount rather than settling the full balance', async () => {
    // An amount of 0 is a deliberate "nothing was collected", not a missing
    // amount. Treating it as absent would bank the whole balance as paid.
    await expect(
      ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 0 }),
    ).rejects.toThrow('must be greater than zero');
    expect(ctx.repository.create).not.toHaveBeenCalled();
  });

  it('settles the full balance and marks the invoice PAID', async () => {
    const result = await ctx.service.markInvoicePaidManually(manualPayload);

    expect(result).toEqual({ success: true });
    expect(ctx.repository.create).toHaveBeenCalledTimes(1);
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: { increment: 10000 } },
      'clinic-1',
      expect.anything(),
    );
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { status: InvoiceStatus.PAID },
      'clinic-1',
      expect.anything(),
    );
  });

  it('records a partial payment as PARTIALLY_PAID', async () => {
    await ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 50 });

    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: { increment: 5000 } },
      'clinic-1',
      expect.anything(),
    );
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { status: InvoiceStatus.PARTIALLY_PAID },
      'clinic-1',
      expect.anything(),
    );
  });

  it('concurrent settlements accumulate instead of overwriting (atomic increment)', async () => {
    // Two overlapping settlements of 4000 each against the same 10000 invoice:
    // each applies its own increment on top of the committed total.
    await ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 40 });
    ctx.invoiceRepository.findById.mockResolvedValueOnce(
      invoice({ amountPaidCents: 4000 }),
    );
    await ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 40 });

    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: { increment: 4000 } },
      'clinic-1',
      expect.anything(),
    );
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { status: InvoiceStatus.PARTIALLY_PAID },
      'clinic-1',
      expect.anything(),
    );
  });

  it('rolls back the whole settlement when a concurrent payment already consumed the balance', async () => {
    // Validation passed outside the transaction (balance looked sufficient),
    // but by increment time another committed payment had consumed it.
    ctx.invoiceRepository.update.mockImplementationOnce(
      async (_id: string, data: Record<string, unknown>) => {
        const increment = (
          (data.amountPaidCents ?? {}) as { increment?: number }
        ).increment;
        if (typeof increment === 'number') {
          ctx.dbState.amountPaidCents += increment;
        }
        return { ...ctx.dbState, amountPaidCents: 12000 };
      },
    );

    await expect(
      ctx.service.markInvoicePaidManually({ ...manualPayload, amount: 100 }),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.repository.create).toHaveBeenCalled();
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
    ctx.invoiceRepository.findById.mockResolvedValueOnce({
      ...withAdvance(30000),
      amountPaidCents: 4000,
    } as unknown as InvoiceDetail);
    ctx.dbState.amountPaidCents = 4000;
    ctx.repository.findByInvoiceId.mockResolvedValueOnce([
      settledSession(4000),
    ]);

    await ctx.service.applyAppointmentAdvance('inv-1', 'clinic-1');

    // balance = 10000 - 4000 = 6000; advance 30000 is capped to 6000 → PAID.
    expect(ctx.repository.create).toHaveBeenCalledTimes(1);
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { amountPaidCents: { increment: 6000 } },
      'clinic-1',
      expect.anything(),
    );
    expect(ctx.invoiceRepository.update).toHaveBeenCalledWith(
      'inv-1',
      { status: InvoiceStatus.PAID },
      'clinic-1',
      expect.anything(),
    );
  });
});
