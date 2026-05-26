import { Injectable, Inject } from '@nestjs/common';
import {
  ENTERPRISE_CONTRACT_PERSISTENCE_PORT,
  type EnterpriseContractPersistencePort,
} from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import {
  EnterpriseContract,
  EnterpriseContractStatus,
  Prisma,
  Role,
  UsageType,
} from '@workspace/db';
import {
  type EnterpriseContractEstimate,
  enterpriseContractCustomLineItemsJsonSchema,
} from '@workspace/types';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import {
  buildEnterpriseUsageMeter,
  currentCalendarMonthPeriod,
} from '@/domains/enterprise-contracts/application/services/enterprise-contracts-estimate.helpers';

export interface ContractWithMembers extends EnterpriseContract {
  members: {
    id: string;
    clinicId: string;
    joinedAt: Date;
    removedAt: Date | null;
  }[];
}

function isContractWithMembers(
  contract: ContractWithMembers | EnterpriseContract,
): contract is ContractWithMembers {
  return 'members' in contract && Array.isArray(contract.members);
}

@Injectable()
export class EnterpriseContractsQueryService {
  constructor(
    @Inject(ENTERPRISE_CONTRACT_PERSISTENCE_PORT)
    private readonly persistence: EnterpriseContractPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  /** All non-removed member clinic IDs for a contract. */
  activeMemberClinicIds(c: ContractWithMembers): string[] {
    return c.members.filter((m) => m.removedAt === null).map((m) => m.clinicId);
  }
  async list(): Promise<ContractWithMembers[]> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () =>
      this.persistence.enterpriseContract.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { members: true },
      }),
    );
  }

  /** Resolve the contract that covers a given clinic (member or primary). */
  async getForClinicId(clinicId: string): Promise<ContractWithMembers | null> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const member = await this.persistence.enterpriseContractMember.findUnique(
        {
          where: { clinicId },
        },
      );
      if (member) {
        return this.persistence.enterpriseContract.findUnique({
          where: { id: member.contractId },
          include: { members: true },
        });
      }
      return this.persistence.enterpriseContract.findFirst({
        where: { primaryClinicId: clinicId },
        include: { members: true },
      });
    });
  }
  async getByContractId(id: string): Promise<ContractWithMembers | null> {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () =>
      this.persistence.enterpriseContract.findUnique({
        where: { id },
        include: { members: true },
      }),
    );
  }

  async getActiveForClinicId(
    clinicId: string,
  ): Promise<ContractWithMembers | null> {
    const contract = await this.getForClinicId(clinicId);
    if (!contract) return null;
    if (contract.status !== EnterpriseContractStatus.ACTIVE) return null;
    return contract;
  }
  async listRevisions(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () =>
      this.persistence.enterpriseContractRevision.findMany({
        where: { contractId },
        orderBy: { effectiveDate: 'desc' },
      }),
    );
  }

  async listInvoices(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () =>
      this.persistence.enterpriseContractInvoice.findMany({
        where: { contractId },
        orderBy: { createdAt: 'desc' },
        include: { subscriptionPayment: true },
      }),
    );
  }

  async listTrueUpAlerts(contractId: string) {
    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () =>
      this.persistence.enterpriseTrueUpAlert.findMany({
        where: { contractId },
        orderBy: { alertedAt: 'desc' },
      }),
    );
  }

  /**
   * Live current-period estimate. For group contracts, meters aggregate across
   * all member clinics.
   */
  async estimateCurrentPeriod(
    contractId: string,
  ): Promise<EnterpriseContractEstimate | null> {
    const contract = await this.getByContractId(contractId);
    if (!contract || contract.status !== EnterpriseContractStatus.ACTIVE) {
      return null;
    }

    const memberIds = this.activeMemberClinicIds(contract);
    if (memberIds.length === 0) return null;

    const now = this.clock.now();
    const { periodStart, periodEnd } = currentCalendarMonthPeriod(now);

    // RLS-BYPASS: enterprise contract administration spans member clinics by design
    return this.persistence.runUnrestricted(async () => {
      const [
        consultationCount,
        userCount,
        doctorCount,
        whatsappAgg,
        storageAgg,
        prescriptionAgg,
        invoiceAgg,
      ] = await Promise.all([
        this.persistence.appointment.count({
          where: {
            clinicId: { in: memberIds },
            status: 'COMPLETED',
            updatedAt: { gte: periodStart, lte: periodEnd },
          },
        }),
        this.persistence.user.count({
          where: {
            clinicId: { in: memberIds },
            NOT: {
              AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
            },
          },
        }),
        this.persistence.doctorClinic.count({
          where: { clinicId: { in: memberIds }, active: true },
        }),
        this.persistence.usageEvent.aggregate({
          where: {
            clinicId: { in: memberIds },
            type: UsageType.WHATSAPP_MESSAGES,
            timestamp: { gte: periodStart, lte: periodEnd },
          },
          _sum: { quantity: true },
        }),
        this.persistence.usageEvent.aggregate({
          where: {
            clinicId: { in: memberIds },
            type: UsageType.STORAGE_GB,
            timestamp: { gte: periodStart, lte: periodEnd },
          },
          _sum: { quantity: true },
        }),
        this.persistence.usageEvent.aggregate({
          where: {
            clinicId: { in: memberIds },
            type: UsageType.PRESCRIPTIONS,
            timestamp: { gte: periodStart, lte: periodEnd },
          },
          _sum: { quantity: true },
        }),
        this.persistence.usageEvent.aggregate({
          where: {
            clinicId: { in: memberIds },
            type: UsageType.INVOICES,
            timestamp: { gte: periodStart, lte: periodEnd },
          },
          _sum: { quantity: true },
        }),
      ]);

      const whatsappUsed = whatsappAgg._sum.quantity ?? 0;
      const storageUsed = storageAgg._sum.quantity ?? 0;
      const prescriptionsUsed = prescriptionAgg._sum.quantity ?? 0;
      const invoicesUsed = invoiceAgg._sum.quantity ?? 0;

      const meters = {
        users: buildEnterpriseUsageMeter(
          userCount,
          contract.includedUsers,
          contract.overageUserCents,
        ),
        consultations: buildEnterpriseUsageMeter(
          consultationCount,
          contract.includedConsultations,
          contract.overageConsultationCents,
        ),
        whatsappMessages: buildEnterpriseUsageMeter(
          whatsappUsed,
          contract.includedWhatsappMessages,
          contract.overageWhatsappCents,
        ),
        storageGB: buildEnterpriseUsageMeter(
          storageUsed,
          contract.includedStorageGB,
          contract.overageStorageCents,
        ),
        doctors: buildEnterpriseUsageMeter(
          doctorCount,
          contract.includedDoctors,
          contract.overageDoctorCents,
        ),
        prescriptions: buildEnterpriseUsageMeter(
          prescriptionsUsed,
          contract.includedPrescriptions,
          contract.overagePrescriptionCents,
        ),
        invoices: buildEnterpriseUsageMeter(
          invoicesUsed,
          contract.includedInvoices,
          contract.overageInvoiceCents,
        ),
      };

      const overageTotalCents = Object.values(meters).reduce(
        (sum, m) => sum + m.chargeCents,
        0,
      );

      return {
        contract: this.toJsonContract(contract),
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        meters,
        platformFeeCents: contract.platformFeeCents,
        setupFeeCents: contract.setupFeeCents,
        dedicatedSupportCents: contract.dedicatedSupportCents,
        overageTotalCents,
        projectedMonthTotalCents:
          contract.platformFeeCents +
          contract.dedicatedSupportCents +
          overageTotalCents,
        currency: contract.currency,
      };
    });
  }

  async previewCurrentPeriodInvoice(contractId: string) {
    const estimate = await this.estimateCurrentPeriod(contractId);
    if (!estimate) return null;

    const lines = [
      {
        key: 'platform_fee',
        label: 'Enterprise platform fee',
        quantity: 1,
        included: 0,
        overage: 1,
        unitCents: estimate.platformFeeCents,
        chargeCents: estimate.platformFeeCents,
        source: 'SYSTEM' as const,
      },
      {
        key: 'dedicated_support',
        label: 'Dedicated support retainer',
        quantity: estimate.dedicatedSupportCents > 0 ? 1 : 0,
        included: 0,
        overage: estimate.dedicatedSupportCents > 0 ? 1 : 0,
        unitCents: estimate.dedicatedSupportCents,
        chargeCents: estimate.dedicatedSupportCents,
        source: 'SYSTEM' as const,
      },
      ...Object.entries(estimate.meters).map(([key, meter]) => ({
        key,
        label: key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (char) => char.toUpperCase()),
        quantity: meter.current,
        included: meter.included,
        overage: meter.overage,
        unitCents: meter.overage > 0 ? meter.chargeCents / meter.overage : 0,
        chargeCents: meter.chargeCents,
        source: 'SYSTEM' as const,
      })),
    ].filter((line) => line.chargeCents > 0 || line.key === 'platform_fee');

    const subtotalCents = lines.reduce(
      (total, line) => total + line.chargeCents,
      0,
    );

    return {
      period: estimate.period,
      currency: estimate.currency,
      lines,
      subtotalCents,
      taxCents: 0,
      totalCents: subtotalCents,
    };
  }

  toJsonContract(contract: ContractWithMembers | EnterpriseContract) {
    const memberClinicIds = isContractWithMembers(contract)
      ? contract.members
          .filter((m) => m.removedAt === null)
          .map((m) => m.clinicId)
      : [];
    return {
      id: contract.id,
      primaryClinicId: contract.primaryClinicId,
      groupName: contract.groupName,
      memberClinicIds,
      contractNumber: contract.contractNumber,
      status: contract.status,
      startDate: contract.startDate.toISOString(),
      endDate: contract.endDate.toISOString(),
      billingCycle: contract.billingCycle,
      currency: contract.currency,
      platformFeeCents: contract.platformFeeCents,
      includedUsers: contract.includedUsers,
      includedConsultations: contract.includedConsultations,
      includedWhatsappMessages: contract.includedWhatsappMessages,
      includedStorageGB: contract.includedStorageGB,
      includedBranches: contract.includedBranches,
      includedDoctors: contract.includedDoctors,
      includedPrescriptions: contract.includedPrescriptions,
      includedInvoices: contract.includedInvoices,
      overageUserCents: contract.overageUserCents,
      overageConsultationCents: contract.overageConsultationCents,
      overageWhatsappCents: contract.overageWhatsappCents,
      overageStorageCents: contract.overageStorageCents,
      overageDoctorCents: contract.overageDoctorCents,
      overagePrescriptionCents: contract.overagePrescriptionCents,
      overageInvoiceCents: contract.overageInvoiceCents,
      setupFeeCents: contract.setupFeeCents,
      dedicatedSupportCents: contract.dedicatedSupportCents,
      customLineItems: this.parseCustomLineItems(contract.customLineItems),
      annualPrepayDiscountPercent: contract.annualPrepayDiscountPercent,
      trueUpThresholdPercent: contract.trueUpThresholdPercent,
      notes: contract.notes,
      signedDocumentUrl: contract.signedDocumentUrl,
      lastTrueUpAlertAt: contract.lastTrueUpAlertAt?.toISOString() ?? null,
      annualPrepayInvoiceId: contract.annualPrepayInvoiceId,
      createdAt: contract.createdAt.toISOString(),
      updatedAt: contract.updatedAt.toISOString(),
    };
  }

  parseCustomLineItems(value: Prisma.JsonValue) {
    const parsed = enterpriseContractCustomLineItemsJsonSchema.safeParse(value);
    return parsed.success ? parsed.data : [];
  }
}
