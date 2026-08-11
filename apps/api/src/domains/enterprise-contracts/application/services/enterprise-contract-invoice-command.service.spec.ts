import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EnterpriseContractStatus, EnterpriseInvoiceKind } from '@workspace/db';
import type { EnterpriseContractPersistencePort } from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import { EnterpriseContractInvoiceCommandService } from './enterprise-contract-invoice-command.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const contract = {
  id: 'contract-1',
  primaryClinicId: 'clinic-1',
  contractNumber: 'ENT-001',
  status: EnterpriseContractStatus.ACTIVE,
  startDate: new Date('2026-06-01T00:00:00.000Z'),
  endDate: new Date('2027-05-31T00:00:00.000Z'),
  platformFeeCents: 50_000_00,
  setupFeeCents: 2_500_00,
  annualPrepayDiscountPercent: 10,
  currency: 'INR',
};

function createService(overrides?: {
  contract?: typeof contract | null;
  existingInvoice?: unknown;
}) {
  const subscriptionPaymentUpsert = jest.fn(async () => ({ id: 'payment-1' }));
  const subscriptionPaymentCreate = jest.fn(async () => ({ id: 'payment-2' }));
  const enterpriseContractInvoiceUpsert = jest.fn(async (args: unknown) => ({
    id: 'invoice-1',
    contractId: 'contract-1',
    subscriptionPaymentId: 'payment-1',
    ...((args as { create?: object }).create ?? {}),
    createdAt: new Date('2026-06-05T00:00:00.000Z'),
    updatedAt: new Date('2026-06-05T00:00:00.000Z'),
  }));
  const enterpriseContractInvoiceCreate = jest.fn(async (args: unknown) => ({
    id: 'invoice-2',
    ...((args as { data?: object }).data ?? {}),
    createdAt: new Date('2026-06-05T00:00:00.000Z'),
    updatedAt: new Date('2026-06-05T00:00:00.000Z'),
  }));

  const tx = {
    subscriptionPayment: {
      create: subscriptionPaymentCreate,
      upsert: subscriptionPaymentUpsert,
    },
    enterpriseContractInvoice: {
      create: enterpriseContractInvoiceCreate,
      upsert: enterpriseContractInvoiceUpsert,
    },
  };
  type TransactionMock = typeof tx;

  const persistence = {
    runUnrestricted: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    enterpriseContract: {
      findUnique: jest.fn(async () =>
        overrides && 'contract' in overrides ? overrides.contract : contract,
      ),
    },
    enterpriseContractInvoice: {
      findFirst: jest.fn(async () => overrides?.existingInvoice ?? null),
    },
    $transaction: jest.fn(
      async (fn: (tx: TransactionMock) => Promise<unknown>) => fn(tx),
    ),
  } as unknown as EnterpriseContractPersistencePort;

  const service = new EnterpriseContractInvoiceCommandService(
    persistence,
    { now: () => new Date('2026-06-05T00:00:00.000Z') } satisfies IClock,
  );

  return {
    service,
    persistence,
    subscriptionPaymentCreate,
    subscriptionPaymentUpsert,
    enterpriseContractInvoiceCreate,
    enterpriseContractInvoiceUpsert,
  };
}

describe('EnterpriseContractInvoiceCommandService', () => {
  describe('generateSetupFeeInvoice', () => {
    it('requires an existing contract', async () => {
      const { service } = createService({ contract: null });

      await expect(
        service.generateSetupFeeInvoice('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires setup fee to be at least INR 2,500 before invoicing', async () => {
      const { service } = createService({
        contract: { ...contract, setupFeeCents: 2_499_00 },
      });

      await expect(
        service.generateSetupFeeInvoice('contract-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns the existing setup fee invoice when already raised', async () => {
      const existingInvoice = { id: 'existing-invoice' };
      const { service, persistence } = createService({ existingInvoice });

      await expect(service.generateSetupFeeInvoice('contract-1')).resolves.toBe(
        existingInvoice,
      );
      expect(persistence.$transaction).not.toHaveBeenCalled();
    });

    it('creates a pending setup fee payment and enterprise invoice', async () => {
      const {
        service,
        subscriptionPaymentUpsert,
        enterpriseContractInvoiceUpsert,
      } = createService();

      await expect(
        service.generateSetupFeeInvoice('contract-1'),
      ).resolves.toMatchObject({
        kind: EnterpriseInvoiceKind.SETUP_FEE,
        amountCents: 2_500_00,
      });

      expect(subscriptionPaymentUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            clinicId: 'clinic-1',
            amountCents: 2_500_00,
            status: 'pending',
            invoiceNumber: 'ENT-SETUP-ENT-001',
          }),
        }),
      );
      expect(enterpriseContractInvoiceUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            contractId: 'contract-1',
            kind: EnterpriseInvoiceKind.SETUP_FEE,
            amountCents: 2_500_00,
            metadata: {
              setupFeeCents: 2_500_00,
              minimumSetupFeeCents: 2_500_00,
            },
          }),
        }),
      );
    });
  });

  describe('generateAdjustmentInvoice', () => {
    it('creates a custom pending adjustment invoice', async () => {
      const {
        service,
        subscriptionPaymentCreate,
        enterpriseContractInvoiceCreate,
      } = createService();

      await expect(
        service.generateAdjustmentInvoice('contract-1', {
          label: 'Migration support',
          amountCents: 12_345_00,
        }),
      ).resolves.toMatchObject({
        kind: EnterpriseInvoiceKind.ADJUSTMENT,
        amountCents: 12_345_00,
      });

      expect(subscriptionPaymentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicId: 'clinic-1',
            amountCents: 12_345_00,
            status: 'pending',
            invoiceNumber: expect.stringMatching(/^ENT-ADJ-ENT-001-/),
            description: 'Migration support for enterprise contract ENT-001',
          }),
        }),
      );
      expect(enterpriseContractInvoiceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contractId: 'contract-1',
            kind: EnterpriseInvoiceKind.ADJUSTMENT,
            amountCents: 12_345_00,
            metadata: { label: 'Migration support' },
          }),
        }),
      );
    });
  });
});
