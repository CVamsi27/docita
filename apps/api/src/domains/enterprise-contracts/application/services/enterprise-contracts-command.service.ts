import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  EnterpriseContractStatus,
  EnterpriseInvoiceKind,
  Prisma,
  ClinicTier,
} from '@workspace/db';
import { type UpsertEnterpriseContractRequest } from '@workspace/types';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  EnterpriseContractsQueryService,
  type ContractWithMembers,
} from './enterprise-contracts-query.service';

@Injectable()
export class EnterpriseContractsCommandService {
  private readonly logger = new Logger(EnterpriseContractsCommandService.name);

  constructor(
    private readonly query: EnterpriseContractsQueryService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
  ) {}

  async upsert(
    primaryClinicId: string,
    payload: UpsertEnterpriseContractRequest,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      throw new BadRequestException('Invalid startDate or endDate');
    if (endDate.getTime() <= startDate.getTime())
      throw new BadRequestException('endDate must be after startDate');

    const clinic = await this.prisma.runUnrestricted(() =>
      this.prisma.clinic.findUnique({ where: { id: primaryClinicId } }),
    );
    if (!clinic)
      throw new NotFoundException(`Clinic ${primaryClinicId} not found`);

    return this.prisma.runUnrestricted(async () => {
      const existing = await this.prisma.enterpriseContract.findUnique({
        where: { contractNumber: payload.contractNumber },
        include: { members: true },
      });

      const data: Prisma.EnterpriseContractUncheckedCreateInput = {
        primaryClinicId,
        groupName: payload.groupName ?? null,
        contractNumber: payload.contractNumber,
        status: payload.status ?? EnterpriseContractStatus.DRAFT,
        startDate,
        endDate,
        billingCycle: payload.billingCycle ?? 'MONTHLY',
        currency: payload.currency,
        platformFeeCents: payload.platformFeeCents,
        includedUsers: payload.includedUsers,
        includedConsultations: payload.includedConsultations,
        includedWhatsappMessages: payload.includedWhatsappMessages,
        includedStorageGB: payload.includedStorageGB,
        includedBranches: payload.includedBranches,
        includedDoctors: payload.includedDoctors ?? 0,
        includedPrescriptions: payload.includedPrescriptions ?? 0,
        includedInvoices: payload.includedInvoices ?? 0,
        overageUserCents: payload.overageUserCents,
        overageConsultationCents: payload.overageConsultationCents,
        overageWhatsappCents: payload.overageWhatsappCents,
        overageStorageCents: payload.overageStorageCents,
        overageDoctorCents: payload.overageDoctorCents ?? 0,
        overagePrescriptionCents: payload.overagePrescriptionCents ?? 0,
        overageInvoiceCents: payload.overageInvoiceCents ?? 0,
        setupFeeCents: payload.setupFeeCents ?? 0,
        dedicatedSupportCents: payload.dedicatedSupportCents ?? 0,
        customLineItems: (payload.customLineItems ??
          []) as Prisma.InputJsonValue,
        annualPrepayDiscountPercent: payload.annualPrepayDiscountPercent ?? 0,
        trueUpThresholdPercent: payload.trueUpThresholdPercent ?? 130,
        notes: payload.notes ?? null,
        signedDocumentUrl: payload.signedDocumentUrl ?? null,
      };

      const contract = await this.prisma.enterpriseContract.upsert({
        where: { contractNumber: payload.contractNumber },
        update: { ...data },
        create: { ...data },
      });

      await this.prisma.enterpriseContractMember.upsert({
        where: { clinicId: primaryClinicId },
        update: { contractId: contract.id, removedAt: null },
        create: { contractId: contract.id, clinicId: primaryClinicId },
      });

      const memberClinicIds = (
        await this.prisma.enterpriseContractMember.findMany({
          where: { contractId: contract.id, removedAt: null },
        })
      ).map((m) => m.clinicId);

      await this.prisma.subscription.updateMany({
        where: { clinicId: { in: memberClinicIds } },
        data: {
          plan: ClinicTier.ENTERPRISE,
          basePriceCents: contract.platformFeeCents,
          currency: contract.currency,
          billingCycle: contract.billingCycle,
          includedAppointments: contract.includedConsultations,
          includedUsers: contract.includedUsers,
          includedStorageGB: contract.includedStorageGB,
        },
      });

      await this.prisma.enterpriseContractRevision.create({
        data: {
          contractId: contract.id,
          effectiveDate: new Date(),
          changeSummary:
            payload.changeSummary ?? (existing ? 'Updated' : 'Created'),
          snapshot: JSON.parse(JSON.stringify(existing ?? {})),
          createdById: actorUserId ?? null,
        },
      });

      this.logger.log(
        `Enterprise contract ${existing ? 'updated' : 'created'} for ${contract.contractNumber} (primary clinic ${primaryClinicId}, ${memberClinicIds.length} members)`,
      );
      return this.prisma.enterpriseContract.findUniqueOrThrow({
        where: { id: contract.id },
        include: { members: true },
      });
    });
  }

  async setStatus(
    contractId: string,
    status: EnterpriseContractStatus,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    return this.prisma.runUnrestricted(async () => {
      const existing = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
        include: { members: true },
      });
      if (!existing)
        throw new NotFoundException(`Contract ${contractId} not found`);
      const updated = await this.prisma.enterpriseContract.update({
        where: { id: contractId },
        data: { status },
        include: { members: true },
      });
      await this.prisma.enterpriseContractRevision.create({
        data: {
          contractId: updated.id,
          effectiveDate: new Date(),
          changeSummary: `Status changed: ${existing.status} → ${status}`,
          snapshot: JSON.parse(JSON.stringify(existing)),
          createdById: actorUserId ?? null,
        },
      });
      return updated;
    });
  }

  async addMember(
    contractId: string,
    clinicId: string,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);
      const existingMember =
        await this.prisma.enterpriseContractMember.findUnique({
          where: { clinicId },
        });
      if (existingMember && existingMember.contractId !== contractId) {
        throw new BadRequestException(
          `Clinic ${clinicId} is already a member of contract ${existingMember.contractId}`,
        );
      }
      await this.prisma.enterpriseContractMember.upsert({
        where: { clinicId },
        update: { contractId, removedAt: null },
        create: { contractId, clinicId },
      });
      await this.prisma.subscription.updateMany({
        where: { clinicId },
        data: {
          plan: ClinicTier.ENTERPRISE,
          basePriceCents: contract.platformFeeCents,
          currency: contract.currency,
          billingCycle: contract.billingCycle,
          includedAppointments: contract.includedConsultations,
          includedUsers: contract.includedUsers,
          includedStorageGB: contract.includedStorageGB,
        },
      });
      await this.prisma.enterpriseContractRevision.create({
        data: {
          contractId,
          effectiveDate: new Date(),
          changeSummary: `Added member clinic ${clinicId}`,
          snapshot: {},
          createdById: actorUserId ?? null,
        },
      });
      return this.prisma.enterpriseContract.findUniqueOrThrow({
        where: { id: contractId },
        include: { members: true },
      });
    });
  }

  async removeMember(
    contractId: string,
    clinicId: string,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      if (contract.primaryClinicId === clinicId)
        throw new BadRequestException(
          'Cannot remove the primary clinic from a contract; transfer the contract first.',
        );
      await this.prisma.enterpriseContractMember.update({
        where: { clinicId },
        data: { removedAt: new Date() },
      });
      await this.prisma.enterpriseContractRevision.create({
        data: {
          contractId,
          effectiveDate: new Date(),
          changeSummary: `Removed member clinic ${clinicId}`,
          snapshot: {},
          createdById: actorUserId ?? null,
        },
      });
      return this.prisma.enterpriseContract.findUniqueOrThrow({
        where: { id: contractId },
        include: { members: true },
      });
    });
  }

  async generateAnnualPrepayInvoice(contractId: string) {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract)
        throw new NotFoundException(`Contract ${contractId} not found`);
      if (contract.status !== EnterpriseContractStatus.ACTIVE)
        throw new BadRequestException(
          'Annual prepay only available for ACTIVE contracts',
        );

      const existing = await this.prisma.enterpriseContractInvoice.findFirst({
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

      const payment = await this.prisma.subscriptionPayment.upsert({
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

      const invoice = await this.prisma.enterpriseContractInvoice.upsert({
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

      await this.prisma.enterpriseContract.update({
        where: { id: contractId },
        data: { annualPrepayInvoiceId: invoice.id },
      });
      this.logger.log(
        `Annual prepay invoice generated for contract ${contract.contractNumber}: net ${netCents / 100} ${contract.currency}`,
      );
      return invoice;
    });
  }

  async evaluateAndAlertTrueUp(
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract || contract.status !== EnterpriseContractStatus.ACTIVE)
        return { alerted: false, observedPercent: 0 };

      const now = new Date();
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

      const members = await this.prisma.enterpriseContractMember.findMany({
        where: { contractId, removedAt: null },
      });
      const ytdOverageAgg = await this.prisma.usageRecord.aggregate({
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
      const alreadyAlerted = await this.prisma.enterpriseTrueUpAlert.findFirst({
        where: { contractId, alertedAt: { gte: monthStart } },
      });
      if (alreadyAlerted) return { alerted: false, observedPercent };

      const recipients = this.configService.getInternalAllowedEmails();
      await this.prisma.enterpriseTrueUpAlert.create({
        data: {
          contractId,
          thresholdPercent: contract.trueUpThresholdPercent,
          observedPercent,
          ytdOverageCents,
          ytdPlatformCents,
          recipients,
        },
      });
      await this.prisma.enterpriseContract.update({
        where: { id: contractId },
        data: { lastTrueUpAlertAt: now },
      });

      if (recipients.length > 0) {
        const subject = `[Docita] True-up alert: ${contract.contractNumber} at ${observedPercent}% of commit`;
        const body = `Contract ${contract.contractNumber} (primary clinic ${contract.primaryClinicId}) has reached ${observedPercent}% of its annual commitment (threshold: ${contract.trueUpThresholdPercent}%).\n\nYTD platform fees: ${(ytdPlatformCents / 100).toFixed(2)} ${contract.currency}\nYTD overages: ${(ytdOverageCents / 100).toFixed(2)} ${contract.currency}\nMonths elapsed in term: ${monthsElapsed}\n\nAction: open the Docita Internal app → Enterprise Contracts → ${contract.contractNumber} and schedule a renegotiation conversation with the customer's account manager.`;
        try {
          await Promise.all(
            recipients.map((email) =>
              this.emailService.send({ to: email, subject, text: body }),
            ),
          );
        } catch (err) {
          this.logger.warn(
            `True-up alert email send failed for ${contract.contractNumber}`,
            err as Error,
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
