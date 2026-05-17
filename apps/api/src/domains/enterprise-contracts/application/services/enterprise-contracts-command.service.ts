import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EnterpriseContractStatus, Prisma, ClinicTier } from '@workspace/db';
import { type UpsertEnterpriseContractRequest } from '@workspace/types';
import {
  EnterpriseContractsQueryService,
  type ContractWithMembers,
} from './enterprise-contracts-query.service';
import { EnterpriseContractInvoiceCommandService } from './enterprise-contract-invoice-command.service';

/**
 * Handles enterprise-contract lifecycle mutations: upsert, status transitions,
 * and member add/remove. Invoice and true-up operations live in EnterpriseContractInvoiceCommandService.
 */
@Injectable()
export class EnterpriseContractsCommandService {
  private readonly logger = new Logger(EnterpriseContractsCommandService.name);

  constructor(
    private readonly query: EnterpriseContractsQueryService,
    private readonly prisma: PrismaService,
    private readonly invoiceService: EnterpriseContractInvoiceCommandService,
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

    const clinic = await this.prisma.runUnrestricted(async () =>
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

  generateAnnualPrepayInvoice(contractId: string) {
    return this.invoiceService.generateAnnualPrepayInvoice(contractId);
  }

  evaluateAndAlertTrueUp(
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> {
    return this.invoiceService.evaluateAndAlertTrueUp(contractId);
  }
}
