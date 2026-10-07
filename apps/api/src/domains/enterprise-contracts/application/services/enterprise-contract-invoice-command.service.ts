// jscpd:ignore-start
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ENTERPRISE_CONTRACT_PERSISTENCE_PORT,
  type EnterpriseContractPersistencePort,
} from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import {
  EnterpriseContractStatus,
  EnterpriseInvoiceKind,
  Prisma,
  type EnterpriseContract,
} from '@workspace/db';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { createHash } from 'node:crypto';
import { type EnterpriseAdjustmentInvoiceRequest } from '@workspace/types';

const MINIMUM_SETUP_FEE_CENTS = 2500_00;

/**
 * Handles enterprise-contract financial operations: annual prepay invoice generation
 * and true-up threshold alerting. Extracted from EnterpriseContractsCommandService (SRP).
 */
@Injectable()
export class EnterpriseContractInvoiceCommandService {
  private readonly logger = new Logger(
    EnterpriseContractInvoiceCommandService.name,
  );

  constructor(
    @Inject(ENTERPRISE_CONTRACT_PERSISTENCE_PORT)
    private readonly persistence: EnterpriseContractPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Looks up a contract by id or throws `NotFoundException`. All three
   * invoice-generation entry points need this exact lookup before applying
   * their (different) status/amount validation.
   */
  private async getContractOrThrow(
    contractId: string,
  ): Promise<EnterpriseContract> {
    const contract = await this.persistence.enterpriseContract.findUnique({
      where: { id: contractId },
    });
    if (!contract)
      throw new NotFoundException(`Contract ${contractId} not found`);
    return contract;
  }

  /**
   * Upserts the `subscriptionPayment` row keyed by `clinicId`+`invoiceNumber`
   * for an enterprise invoice. Both invoice-generation entry points need an
   * idempotent payment record before creating their invoice; only amount
   * and description differ.
   */
  // jscpd:ignore-end
  private upsertContractInvoicePayment(
    tx: Prisma.TransactionClient,
    params: {
      clinicId: string;
      invoiceNumber: string;
      amountCents: number;
      currency: string;
      description: string;
    },
  ) {
    return tx.subscriptionPayment.upsert({
      where: {
        clinicId_invoiceNumber: {
          clinicId: params.clinicId,
          invoiceNumber: params.invoiceNumber,
        },
      },
      update: {
        amountCents: params.amountCents,
        currency: params.currency,
        description: params.description,
      },
      create: {
        clinicId: params.clinicId,
        amountCents: params.amountCents,
        currency: params.currency,
        status: 'pending',
        invoiceNumber: params.invoiceNumber,
        description: params.description,
      },
    });
  }
  async generateAnnualPrepayInvoice(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.getContractOrThrow(contractId);
      if (contract.status !== EnterpriseContractStatus.ACTIVE)
        throw new BadRequestException(
          'Annual prepay only available for ACTIVE contracts',
        );

      const existing =
        await this.persistence.enterpriseContractInvoice.findFirst({
          where: {
            contractId,
            kind: EnterpriseInvoiceKind.ANNUAL_PREPAY,
            periodStart: contract.startDate,
          },
          include: { subscriptionPayment: true },
        });
      if (existing) return existing;

      const grossCents = contract.platformFeeCents * 12;
      const discountCents = Math.round(
        (grossCents * contract.annualPrepayDiscountPercent) / 100,
      );
      const netCents = grossCents - discountCents;
      const { startDate: periodStart, endDate: periodEnd } = contract;
      const invoiceNumber = `ENT-PREPAY-${contract.contractNumber}-${periodStart.getFullYear()}`;
      const description = `Annual platform fee prepay for contract ${contract.contractNumber} (${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)})${contract.annualPrepayDiscountPercent ? `, discount ${contract.annualPrepayDiscountPercent}%` : ''}`;

      const invoice = await this.persistence.$transaction(async (tx) => {
        const payment = await this.upsertContractInvoicePayment(tx, {
          clinicId: contract.primaryClinicId,
          invoiceNumber,
          amountCents: netCents,
          currency: contract.currency,
          description,
        });

        const createdInvoice = await tx.enterpriseContractInvoice.upsert({
          where: { subscriptionPaymentId: payment.id },
          update: {
            amountCents: netCents,
            currency: contract.currency,
            discountPercent: contract.annualPrepayDiscountPercent,
            metadata: { grossCents, discountCents, netCents },
          },
          create: {
            contractId,
            kind: EnterpriseInvoiceKind.ANNUAL_PREPAY,
            subscriptionPaymentId: payment.id,
            amountCents: netCents,
            currency: contract.currency,
            periodStart,
            periodEnd,
            discountPercent: contract.annualPrepayDiscountPercent,
            metadata: { grossCents, discountCents, netCents },
          },
          include: { subscriptionPayment: true },
        });

        await tx.enterpriseContract.update({
          where: { id: contractId },
          data: { annualPrepayInvoiceId: createdInvoice.id },
        });
        return createdInvoice;
      });
      this.logger.log(
        `Annual prepay invoice generated for contract ${contract.contractNumber}: net ${netCents / 100} ${contract.currency}`,
      );
      return invoice;
    });
  }

  async generateSetupFeeInvoice(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.getContractOrThrow(contractId);
      if (contract.status === EnterpriseContractStatus.TERMINATED)
        throw new BadRequestException(
          'Setup fee cannot be raised for terminated contracts',
        );
      if (contract.setupFeeCents < MINIMUM_SETUP_FEE_CENTS)
        throw new BadRequestException(
          'Setup fee must be at least INR 2,500 before raising an invoice',
        );

      const existing =
        await this.persistence.enterpriseContractInvoice.findFirst({
          where: {
            contractId,
            kind: EnterpriseInvoiceKind.SETUP_FEE,
          },
          include: { subscriptionPayment: true },
        });
      if (existing) return existing;

      const { startDate: periodStart } = contract;
      const invoiceNumber = `ENT-SETUP-${contract.contractNumber}`;
      const description = `Enterprise setup fee for contract ${contract.contractNumber}`;

      const invoice = await this.persistence.$transaction(async (tx) => {
        const payment = await this.upsertContractInvoicePayment(tx, {
          clinicId: contract.primaryClinicId,
          invoiceNumber,
          amountCents: contract.setupFeeCents,
          currency: contract.currency,
          description,
        });

        return tx.enterpriseContractInvoice.upsert({
          where: { subscriptionPaymentId: payment.id },
          update: {
            amountCents: contract.setupFeeCents,
            currency: contract.currency,
            metadata: {
              setupFeeCents: contract.setupFeeCents,
              minimumSetupFeeCents: MINIMUM_SETUP_FEE_CENTS,
            },
          },
          create: {
            contractId,
            kind: EnterpriseInvoiceKind.SETUP_FEE,
            subscriptionPaymentId: payment.id,
            amountCents: contract.setupFeeCents,
            currency: contract.currency,
            periodStart,
            periodEnd: periodStart,
            discountPercent: 0,
            metadata: {
              setupFeeCents: contract.setupFeeCents,
              minimumSetupFeeCents: MINIMUM_SETUP_FEE_CENTS,
            },
          },
          include: { subscriptionPayment: true },
        });
      });

      this.logger.log(
        `Setup fee invoice generated for contract ${contract.contractNumber}: ${contract.setupFeeCents / 100} ${contract.currency}`,
      );
      return invoice;
    });
  }

  /**
   * Raises a custom adjustment bill.
   *
   * `idempotencyKey` is required by the request schema and is what makes a
   * retry safe: the invoice number is derived from it, so re-submitting the
   * same request upserts the same `SubscriptionPayment` and the same
   * `EnterpriseContractInvoice` instead of billing the customer twice. Issuing a
   * genuinely new adjustment means issuing a new key.
   */
  async generateAdjustmentInvoice(
    contractId: string,
    payload: EnterpriseAdjustmentInvoiceRequest,
  ) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.getContractOrThrow(contractId);
      if (contract.status === EnterpriseContractStatus.TERMINATED)
        throw new BadRequestException(
          'Custom bill cannot be raised for terminated contracts',
        );

      // Reusing the key with different terms is a caller bug, not a retry:
      // silently returning the earlier invoice would hide the mismatch.
      const existing =
        await this.persistence.enterpriseContractInvoice.findFirst({
          where: {
            contractId,
            kind: EnterpriseInvoiceKind.ADJUSTMENT,
            subscriptionPayment: {
              invoiceNumber: this.adjustmentInvoiceNumber(
                contract.contractNumber,
                payload.idempotencyKey,
              ),
            },
          },
          include: { subscriptionPayment: true },
        });
      if (existing) {
        if (
          existing.amountCents !== payload.amountCents ||
          (existing.subscriptionPayment?.description ?? '') !==
            `${payload.label} for enterprise contract ${contract.contractNumber}`
        ) {
          throw new BadRequestException(
            'idempotencyKey was already used for a different adjustment; use a new key to issue another bill',
          );
        }
        return existing;
      }

      const issuedAt = this.clock.now();
      const invoiceNumber = this.adjustmentInvoiceNumber(
        contract.contractNumber,
        payload.idempotencyKey,
      );
      const description = `${payload.label} for enterprise contract ${contract.contractNumber}`;

      const invoice = await this.persistence.$transaction(async (tx) => {
        const payment = await this.upsertContractInvoicePayment(tx, {
          clinicId: contract.primaryClinicId,
          invoiceNumber,
          amountCents: payload.amountCents,
          currency: contract.currency,
          description,
        });

        return tx.enterpriseContractInvoice.upsert({
          where: { subscriptionPaymentId: payment.id },
          update: {
            amountCents: payload.amountCents,
            currency: contract.currency,
            metadata: {
              label: payload.label,
              idempotencyKey: payload.idempotencyKey,
            },
          },
          create: {
            contractId,
            kind: EnterpriseInvoiceKind.ADJUSTMENT,
            subscriptionPaymentId: payment.id,
            amountCents: payload.amountCents,
            currency: contract.currency,
            periodStart: issuedAt,
            periodEnd: issuedAt,
            discountPercent: 0,
            metadata: {
              label: payload.label,
              idempotencyKey: payload.idempotencyKey,
            },
          },
          include: { subscriptionPayment: true },
        });
      });

      this.logger.log(
        `Custom enterprise bill generated for contract ${contract.contractNumber}: ${payload.amountCents / 100} ${contract.currency}`,
      );
      return invoice;
    });
  }

  /**
   * Deterministic invoice number for an adjustment key. The key is hashed so
   * the result stays inside the column width and cannot inject separators into
   * the `ENT-ADJ-<contract>-<key>` form.
   */
  private adjustmentInvoiceNumber(
    contractNumber: string,
    idempotencyKey: string,
  ): string {
    const digest = createHash('sha256')
      .update(`${contractNumber}:${idempotencyKey}`)
      .digest('hex')
      .slice(0, 16);
    return `ENT-ADJ-${contractNumber}-${digest}`;
  }
}
