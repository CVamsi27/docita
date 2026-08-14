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
  Prisma,
  ClinicTier,
  type EnterpriseContract,
} from '@workspace/db';
import { type UpsertEnterpriseContractRequest } from '@workspace/types';
import {
  EnterpriseContractsQueryService,
  type ContractWithMembers,
} from './enterprise-contracts-query.service';
import { EnterpriseContractInvoiceCommandService } from './enterprise-contract-invoice-command.service';
import { EnterpriseContractTrueUpCommandService } from './enterprise-contract-true-up-command.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';

/**
 * Handles enterprise-contract lifecycle mutations: upsert, status transitions,
 * and member add/remove. Invoice operations live in
 * EnterpriseContractInvoiceCommandService; true-up alerting lives in
 * EnterpriseContractTrueUpCommandService.
 */
@Injectable()
export class EnterpriseContractsCommandService {
  private readonly logger = new Logger(EnterpriseContractsCommandService.name);

  constructor(
    private readonly query: EnterpriseContractsQueryService,
    @Inject(ENTERPRISE_CONTRACT_PERSISTENCE_PORT)
    private readonly persistence: EnterpriseContractPersistencePort,
    private readonly invoiceService: EnterpriseContractInvoiceCommandService,
    private readonly trueUpService: EnterpriseContractTrueUpCommandService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /**
   * Looks up a contract by id or throws the same `NotFoundException` used by
   * every member-mutation entry point — `addMember` and `removeMember` both
   * need this exact lookup before doing their (different) follow-up work.
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
   * Builds the subscription field overrides applied whenever a clinic is
   * placed on (or kept on) an enterprise contract — `upsert` (re-syncing all
   * member subscriptions) and `addMember` (syncing the new member) must apply
   * the exact same tier mapping or members would drift out of sync with their
   * contract terms.
   */
  // jscpd:ignore-end
  private buildEnterpriseSubscriptionOverrides(
    contract: Pick<
      EnterpriseContract,
      | 'platformFeeCents'
      | 'currency'
      | 'billingCycle'
      | 'includedConsultations'
      | 'includedUsers'
      | 'includedStorageGB'
    >,
  ) {
    return {
      plan: ClinicTier.ENTERPRISE,
      basePriceCents: contract.platformFeeCents,
      currency: contract.currency,
      billingCycle: contract.billingCycle,
      includedAppointments: contract.includedConsultations,
      includedUsers: contract.includedUsers,
      includedStorageGB: contract.includedStorageGB,
    };
  }

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

    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    const clinic = await this.persistence.runUnrestricted(async () =>
      this.persistence.clinic.findUnique({ where: { id: primaryClinicId } }),
    );
    if (!clinic)
      throw new NotFoundException(`Clinic ${primaryClinicId} not found`);

    return this.persistence.runUnrestricted(async () => {
      const existing = await this.persistence.enterpriseContract.findUnique({
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
        customLineItems: toPrismaInputJsonValue(payload.customLineItems ?? []),
        annualPrepayDiscountPercent: payload.annualPrepayDiscountPercent ?? 0,
        trueUpThresholdPercent: payload.trueUpThresholdPercent ?? 130,
        notes: payload.notes ?? null,
        signedDocumentUrl: payload.signedDocumentUrl ?? null,
      };

      const result = await this.persistence.$transaction(async (tx) => {
        const contract = await tx.enterpriseContract.upsert({
          where: { contractNumber: payload.contractNumber },
          update: { ...data },
          create: { ...data },
        });

        await tx.enterpriseContractMember.upsert({
          where: { clinicId: primaryClinicId },
          update: { contractId: contract.id, removedAt: null },
          create: { contractId: contract.id, clinicId: primaryClinicId },
        });

        const memberClinicIds = (
          await tx.enterpriseContractMember.findMany({
            where: { contractId: contract.id, removedAt: null },
            // No `take`: bounded by (contractId, removedAt: null). The
            // member set is then passed to subscription.updateMany, so
            // every active member must be present.
          })
        ).map((m) => m.clinicId);

        await tx.subscription.updateMany({
          where: { clinicId: { in: memberClinicIds } },
          data: this.buildEnterpriseSubscriptionOverrides(contract),
        });

        await tx.enterpriseContractRevision.create({
          data: {
            contractId: contract.id,
            effectiveDate: this.clock.now(),
            changeSummary:
              payload.changeSummary ?? (existing ? 'Updated' : 'Created'),
            snapshot: JSON.parse(JSON.stringify(existing ?? {})),
            createdById: actorUserId ?? null,
          },
        });

        return tx.enterpriseContract.findUniqueOrThrow({
          where: { id: contract.id },
          include: { members: true },
        });
      });

      this.logger.log(
        `Enterprise contract ${existing ? 'updated' : 'created'} for ${result.contractNumber} (primary clinic ${primaryClinicId}, ${result.members.length} members)`,
      );
      return result;
    });
  }

  async setStatus(
    contractId: string,
    status: EnterpriseContractStatus,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const existing = await this.persistence.enterpriseContract.findUnique({
        where: { id: contractId },
        include: { members: true },
      });
      if (!existing)
        throw new NotFoundException(`Contract ${contractId} not found`);
      const updated = await this.persistence.enterpriseContract.update({
        where: { id: contractId },
        data: { status },
        include: { members: true },
      });
      await this.persistence.enterpriseContractRevision.create({
        data: {
          contractId: updated.id,
          effectiveDate: this.clock.now(),
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
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.getContractOrThrow(contractId);
      const clinic = await this.persistence.clinic.findUnique({
        where: { id: clinicId },
      });
      if (!clinic) throw new NotFoundException(`Clinic ${clinicId} not found`);
      const existingMember =
        await this.persistence.enterpriseContractMember.findUnique({
          where: { clinicId },
        });
      if (existingMember && existingMember.contractId !== contractId) {
        throw new BadRequestException(
          `Clinic ${clinicId} is already a member of contract ${existingMember.contractId}`,
        );
      }
      return this.persistence.$transaction(async (tx) => {
        await tx.enterpriseContractMember.upsert({
          where: { clinicId },
          update: { contractId, removedAt: null },
          create: { contractId, clinicId },
        });
        await tx.subscription.updateMany({
          where: { clinicId },
          data: this.buildEnterpriseSubscriptionOverrides(contract),
        });
        await tx.enterpriseContractRevision.create({
          data: {
            contractId,
            effectiveDate: this.clock.now(),
            changeSummary: `Added member clinic ${clinicId}`,
            snapshot: {},
            createdById: actorUserId ?? null,
          },
        });
        return tx.enterpriseContract.findUniqueOrThrow({
          where: { id: contractId },
          include: { members: true },
        });
      });
    });
  }

  async removeMember(
    contractId: string,
    clinicId: string,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const contract = await this.getContractOrThrow(contractId);
      if (contract.primaryClinicId === clinicId)
        throw new BadRequestException(
          'Cannot remove the primary clinic from a contract; transfer the contract first.',
        );
      await this.persistence.enterpriseContractMember.update({
        where: { clinicId },
        data: { removedAt: this.clock.now() },
      });
      await this.persistence.enterpriseContractRevision.create({
        data: {
          contractId,
          effectiveDate: this.clock.now(),
          changeSummary: `Removed member clinic ${clinicId}`,
          snapshot: {},
          createdById: actorUserId ?? null,
        },
      });
      return this.persistence.enterpriseContract.findUniqueOrThrow({
        where: { id: contractId },
        include: { members: true },
      });
    });
  }

  generateAnnualPrepayInvoice(contractId: string) {
    return this.invoiceService.generateAnnualPrepayInvoice(contractId);
  }

  generateSetupFeeInvoice(contractId: string) {
    return this.invoiceService.generateSetupFeeInvoice(contractId);
  }

  generateAdjustmentInvoice(
    contractId: string,
    payload: { label: string; amountCents: number },
  ) {
    return this.invoiceService.generateAdjustmentInvoice(contractId, payload);
  }

  evaluateAndAlertTrueUp(
    contractId: string,
  ): Promise<{ alerted: boolean; observedPercent: number }> {
    return this.trueUpService.evaluateAndAlertTrueUp(contractId);
  }
}
