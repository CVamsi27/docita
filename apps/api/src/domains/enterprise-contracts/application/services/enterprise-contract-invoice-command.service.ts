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
import { EnterpriseContractStatus, EnterpriseInvoiceKind } from '@workspace/db';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { nanoid } from 'nanoid';

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
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async generateAnnualPrepayInvoice(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      if (contract.status !== EnterpriseContractStatus.ACTIVE)
        throw new BadRequestException(
          'Annual prepay only available for ACTIVE contracts',
        );

      const existing = await this.persistence.enterpriseContractInvoice.findFirst({
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
        const payment = await tx.subscriptionPayment.upsert({
          where: {
            clinicId_invoiceNumber: {
              clinicId: contract.primaryClinicId,
              invoiceNumber,
            },
          },
          update: {
            amountCents: netCents,
            currency: contract.currency,
            description,
          },
          create: {
            clinicId: contract.primaryClinicId,
            amountCents: netCents,
            currency: contract.currency,
            status: 'pending',
            invoiceNumber,
            description,
          },
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
      const contract = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      if (contract.status === EnterpriseContractStatus.TERMINATED)
        throw new BadRequestException(
          'Setup fee cannot be raised for terminated contracts',
        );
      if (contract.setupFeeCents < MINIMUM_SETUP_FEE_CENTS)
        throw new BadRequestException(
          'Setup fee must be at least INR 2,500 before raising an invoice',
        );

      const existing = await this.persistence.enterpriseContractInvoice.findFirst({
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
        const payment = await tx.subscriptionPayment.upsert({
          where: {
            clinicId_invoiceNumber: {
              clinicId: contract.primaryClinicId,
              invoiceNumber,
            },
          },
          update: {
            amountCents: contract.setupFeeCents,
            currency: contract.currency,
            description,
          },
          create: {
            clinicId: contract.primaryClinicId,
            amountCents: contract.setupFeeCents,
            currency: contract.currency,
            status: 'pending',
            invoiceNumber,
            description,
          },
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

  async generateAdjustmentInvoice(
    contractId: string,
    payload: { label: string; amountCents: number },
  ) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      if (contract.status === EnterpriseContractStatus.TERMINATED)
        throw new BadRequestException(
          'Custom bill cannot be raised for terminated contracts',
        );

      const issuedAt = this.clock.now();
      const invoiceNumber = `ENT-ADJ-${contract.contractNumber}-${nanoid(8)}`;
      const description = `${payload.label} for enterprise contract ${contract.contractNumber}`;

      const invoice = await this.persistence.$transaction(async (tx) => {
        const payment = await tx.subscriptionPayment.create({
          data: {
            clinicId: contract.primaryClinicId,
            amountCents: payload.amountCents,
            currency: contract.currency,
            status: 'pending',
            invoiceNumber,
            description,
          },
        });

        return tx.enterpriseContractInvoice.create({
          data: {
            contractId,
            kind: EnterpriseInvoiceKind.ADJUSTMENT,
            subscriptionPaymentId: payment.id,
            amountCents: payload.amountCents,
            currency: contract.currency,
            periodStart: issuedAt,
            periodEnd: issuedAt,
            discountPercent: 0,
            metadata: { label: payload.label },
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

  async evaluateAndAlertTrueUp(
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract || contract.status !== EnterpriseContractStatus.ACTIVE)
        return { alerted: false, observedPercent: 0 };

      const now = this.clock.now();
      const yearStart =
        contract.startDate > new Date(now.getFullYear(), 0, 1)
          ? contract.startDate
          : new Date(now.getFullYear(), 0, 1);
      const monthsElapsed = Math.max(
        1,
        (now.getFullYear() - yearStart.getFullYear()) * 12 +
          (now.getMonth() - yearStart.getMonth()) +
          1,
      );

      const members = await this.persistence.enterpriseContractMember.findMany({
        where: { contractId, removedAt: null },
      });
      const ytdOverageAgg = await this.persistence.usageRecord.aggregate({
        where: {
          clinicId: { in: members.map((m) => m.clinicId) },
          periodStart: { gte: yearStart, lte: now },
        },
        _sum: { overageChargeCents: true },
      });

      const ytdOverageCents = ytdOverageAgg._sum.overageChargeCents ?? 0;
      const ytdPlatformCents = contract.platformFeeCents * monthsElapsed;
      const observedPercent =
        ytdPlatformCents > 0
          ? Math.round(
              ((ytdOverageCents + ytdPlatformCents) * 100) / ytdPlatformCents,
            )
          : 0;

      if (observedPercent < contract.trueUpThresholdPercent)
        return { alerted: false, observedPercent };

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const alreadyAlerted = await this.persistence.enterpriseTrueUpAlert.findFirst({
          where: { contractId, alertedAt: { gte: monthStart } },
        });
      if (alreadyAlerted) return { alerted: false, observedPercent };

      const recipients = this.configService.getInternalAllowedEmails();
      await this.persistence.enterpriseTrueUpAlert.create({
        data: {
          contractId,
          thresholdPercent: contract.trueUpThresholdPercent,
          observedPercent,
          ytdOverageCents,
          ytdPlatformCents,
          recipients,
        },
      });
      await this.persistence.enterpriseContract.update({
        where: { id: contractId },
        data: { lastTrueUpAlertAt: now },
      });

      if (recipients.length > 0) {
        const subject = `[Docita] True-up alert: ${contract.contractNumber} at ${observedPercent}% of commit`;
        const body = `Contract ${contract.contractNumber} (primary clinic ${contract.primaryClinicId}) has reached ${observedPercent}% of its annual commitment (threshold: ${contract.trueUpThresholdPercent}%).\n\nYTD platform fees: ${(ytdPlatformCents / 100).toFixed(2)} ${contract.currency}\nYTD overages: ${(ytdOverageCents / 100).toFixed(2)} ${contract.currency}\nMonths elapsed in term: ${monthsElapsed}\n\nAction: open the Docita Internal app → Enterprise Contracts → ${contract.contractNumber} and schedule a renegotiation conversation with the customer's account manager.`;
        try {
          const results = await Promise.all(
            recipients.map((email) =>
              this.emailService.send({ to: email, subject, text: body }),
            ),
          );
          const failed = results.filter((result) => !result.success);
          if (failed.length > 0) {
            this.logger.warn(
              `True-up alert email send failed for ${contract.contractNumber}`,
              {
                failedCount: failed.length,
                errors: failed.map((result) => result.error ?? 'unknown'),
              },
            );
          }
        } catch (err) {
          this.logger.warn(
            `True-up alert email send failed for ${contract.contractNumber}`,
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      }

      this.logger.log(
        `True-up alert raised for ${contract.contractNumber}: ${observedPercent}% (threshold ${contract.trueUpThresholdPercent}%)`,
      );
      return { alerted: true, observedPercent };
    });
  }
}
