import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  EnterpriseContract,
  EnterpriseContractStatus,
  EnterpriseInvoiceKind,
  Prisma,
  ClinicTier,
  UsageType,
  Role,
} from '@workspace/db';
import {
  type UpsertEnterpriseContractRequest,
  type EnterpriseContractEstimate,
} from '@workspace/types';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface ContractWithMembers extends EnterpriseContract {
  members: {
    id: string;
    clinicId: string;
    joinedAt: Date;
    removedAt: Date | null;
  }[];
}

@Injectable()
export class EnterpriseContractsService {
  private readonly logger = new Logger(EnterpriseContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: AppConfigService,
  ) {}

  /** All non-removed member clinic IDs for a contract. */
  private activeMemberClinicIds(c: ContractWithMembers): string[] {
    return c.members.filter((m) => m.removedAt === null).map((m) => m.clinicId);
  }

  async list(): Promise<ContractWithMembers[]> {
    return this.prisma.runUnrestricted(() =>
      this.prisma.enterpriseContract.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { members: true },
      }),
    );
  }

  /** Resolve the contract that covers a given clinic (member or primary). */
  async getForClinicId(clinicId: string): Promise<ContractWithMembers | null> {
    return this.prisma.runUnrestricted(async () => {
      const member = await this.prisma.enterpriseContractMember.findUnique({
        where: { clinicId },
      });
      if (member) {
        return this.prisma.enterpriseContract.findUnique({
          where: { id: member.contractId },
          include: { members: true },
        });
      }
      return this.prisma.enterpriseContract.findFirst({
        where: { primaryClinicId: clinicId },
        include: { members: true },
      });
    });
  }

  async getByContractId(id: string): Promise<ContractWithMembers | null> {
    return this.prisma.runUnrestricted(() =>
      this.prisma.enterpriseContract.findUnique({
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

  async upsert(
    primaryClinicId: string,
    payload: UpsertEnterpriseContractRequest,
    actorUserId?: string,
  ): Promise<ContractWithMembers> {
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate');
    }
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const clinic = await this.prisma.runUnrestricted(() =>
      this.prisma.clinic.findUnique({ where: { id: primaryClinicId } }),
    );
    if (!clinic) {
      throw new NotFoundException(`Clinic ${primaryClinicId} not found`);
    }

    return this.prisma.runUnrestricted(async () => {
      // A contract is identified by contractNumber (unique). Look up by that.
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
        overageUserCents: payload.overageUserCents,
        overageConsultationCents: payload.overageConsultationCents,
        overageWhatsappCents: payload.overageWhatsappCents,
        overageStorageCents: payload.overageStorageCents,
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

      // Ensure the primary clinic is also a member (idempotent).
      await this.prisma.enterpriseContractMember.upsert({
        where: { clinicId: primaryClinicId },
        update: { contractId: contract.id, removedAt: null },
        create: { contractId: contract.id, clinicId: primaryClinicId },
      });

      // Mirror negotiated terms onto each member's Subscription so existing
      // billing/preview flows (which read Subscription columns) stay correct.
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
      if (!existing) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }

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
      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic ${clinicId} not found`);
      }
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

      // Mirror onto the new member's subscription.
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
      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }
      if (contract.primaryClinicId === clinicId) {
        throw new BadRequestException(
          'Cannot remove the primary clinic from a contract; transfer the contract first.',
        );
      }
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

  async listRevisions(contractId: string) {
    const contract = await this.getByContractId(contractId);
    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }
    return this.prisma.runUnrestricted(() =>
      this.prisma.enterpriseContractRevision.findMany({
        where: { contractId },
        orderBy: { effectiveDate: 'desc' },
      }),
    );
  }

  async listInvoices(contractId: string) {
    return this.prisma.runUnrestricted(() =>
      this.prisma.enterpriseContractInvoice.findMany({
        where: { contractId },
        orderBy: { createdAt: 'desc' },
        include: { subscriptionPayment: true },
      }),
    );
  }

  async listTrueUpAlerts(contractId: string) {
    return this.prisma.runUnrestricted(() =>
      this.prisma.enterpriseTrueUpAlert.findMany({
        where: { contractId },
        orderBy: { alertedAt: 'desc' },
      }),
    );
  }

  /**
   * Live current-period estimate. For group contracts, meters aggregate across
   * all member clinics. Reads the same sources the monthly billing scheduler
   * uses so the projection matches the eventual invoice.
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

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    return this.prisma.runUnrestricted(async () => {
      const [consultationCount, userCount, whatsappAgg, storageAgg] =
        await Promise.all([
          this.prisma.appointment.count({
            where: {
              clinicId: { in: memberIds },
              status: 'COMPLETED',
              updatedAt: { gte: periodStart, lte: periodEnd },
            },
          }),
          this.prisma.user.count({
            where: {
              clinicId: { in: memberIds },
              NOT: {
                AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
              },
            },
          }),
          this.prisma.usageEvent.aggregate({
            where: {
              clinicId: { in: memberIds },
              type: UsageType.WHATSAPP_MESSAGES,
              timestamp: { gte: periodStart, lte: periodEnd },
            },
            _sum: { quantity: true },
          }),
          this.prisma.usageEvent.aggregate({
            where: {
              clinicId: { in: memberIds },
              type: UsageType.STORAGE_GB,
              timestamp: { gte: periodStart, lte: periodEnd },
            },
            _sum: { quantity: true },
          }),
        ]);

      const whatsappUsed = whatsappAgg._sum.quantity ?? 0;
      const storageUsed = storageAgg._sum.quantity ?? 0;

      const buildMeter = (
        current: number,
        included: number,
        rateCents: number,
      ) => {
        const overage = Math.max(0, current - included);
        return {
          current,
          included,
          overage,
          chargeCents: overage * rateCents,
        };
      };

      const meters = {
        users: buildMeter(
          userCount,
          contract.includedUsers,
          contract.overageUserCents,
        ),
        consultations: buildMeter(
          consultationCount,
          contract.includedConsultations,
          contract.overageConsultationCents,
        ),
        whatsappMessages: buildMeter(
          whatsappUsed,
          contract.includedWhatsappMessages,
          contract.overageWhatsappCents,
        ),
        storageGB: buildMeter(
          storageUsed,
          contract.includedStorageGB,
          contract.overageStorageCents,
        ),
      };

      const overageTotalCents =
        meters.users.chargeCents +
        meters.consultations.chargeCents +
        meters.whatsappMessages.chargeCents +
        meters.storageGB.chargeCents;

      return {
        contract: this.toJsonContract(contract),
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        meters,
        platformFeeCents: contract.platformFeeCents,
        overageTotalCents,
        projectedMonthTotalCents: contract.platformFeeCents + overageTotalCents,
        currency: contract.currency,
      };
    });
  }

  /**
   * Annual-prepay invoice generation. Creates one SubscriptionPayment for the
   * 12-month commitment minus the negotiated discount, plus an
   * EnterpriseContractInvoice ledger row. Idempotent per contract: if a
   * prepay invoice for the contract's current term already exists, returns
   * the existing one.
   */
  async generateAnnualPrepayInvoice(contractId: string) {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }
      if (contract.status !== EnterpriseContractStatus.ACTIVE) {
        throw new BadRequestException(
          'Annual prepay only available for ACTIVE contracts',
        );
      }

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

      const periodStart = contract.startDate;
      const periodEnd = contract.endDate;
      const invoiceNumber = `ENT-PREPAY-${contract.contractNumber}-${periodStart.getFullYear()}`;
      const description = `Annual platform fee prepay for contract ${
        contract.contractNumber
      } (${periodStart.toISOString().slice(0, 10)} → ${periodEnd
        .toISOString()
        .slice(0, 10)})${
        contract.annualPrepayDiscountPercent
          ? `, discount ${contract.annualPrepayDiscountPercent}%`
          : ''
      }`;

      // Reuse SubscriptionPayment plumbing — it carries existing GST invoice
      // PDF generation and Razorpay payment-link wiring.
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

  /**
   * True-up alerting. Emits at most one alert per contract per calendar month
   * when YTD overage cents exceed (threshold% - 100%) of YTD platform-fee
   * cents — i.e. the customer is on track to materially exceed their
   * commitment. Stores an EnterpriseTrueUpAlert row for audit + dedupe.
   */
  async evaluateAndAlertTrueUp(contractId: string): Promise<{
    alerted: boolean;
    observedPercent: number;
  }> {
    return this.prisma.runUnrestricted(async () => {
      const contract = await this.prisma.enterpriseContract.findUnique({
        where: { id: contractId },
      });
      if (!contract || contract.status !== EnterpriseContractStatus.ACTIVE) {
        return { alerted: false, observedPercent: 0 };
      }

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

      const ytdOverageAgg = await this.prisma.usageRecord.aggregate({
        where: {
          clinicId: {
            in: (
              await this.prisma.enterpriseContractMember.findMany({
                where: { contractId, removedAt: null },
              })
            ).map((m) => m.clinicId),
          },
          periodStart: { gte: yearStart, lte: now },
        },
        _sum: { overageChargeCents: true },
      });

      const ytdOverageCents = ytdOverageAgg._sum.overageChargeCents ?? 0;
      const ytdPlatformCents = contract.platformFeeCents * monthsElapsed;

      // Observed percent: total spend / committed platform spend.
      const totalCents = ytdOverageCents + ytdPlatformCents;
      const observedPercent =
        ytdPlatformCents > 0
          ? Math.round((totalCents * 100) / ytdPlatformCents)
          : 0;

      if (observedPercent < contract.trueUpThresholdPercent) {
        return { alerted: false, observedPercent };
      }

      // Dedupe: don't re-alert in the same calendar month.
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const alreadyAlerted = await this.prisma.enterpriseTrueUpAlert.findFirst({
        where: { contractId, alertedAt: { gte: monthStart } },
      });
      if (alreadyAlerted) {
        return { alerted: false, observedPercent };
      }

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
        const body =
          `Contract ${contract.contractNumber} (primary clinic ${contract.primaryClinicId}) ` +
          `has reached ${observedPercent}% of its annual commitment ` +
          `(threshold: ${contract.trueUpThresholdPercent}%).\n\n` +
          `YTD platform fees: ${(ytdPlatformCents / 100).toFixed(2)} ${contract.currency}\n` +
          `YTD overages: ${(ytdOverageCents / 100).toFixed(2)} ${contract.currency}\n` +
          `Months elapsed in term: ${monthsElapsed}\n\n` +
          `Action: open the Docita Internal app → Enterprise Contracts → ${contract.contractNumber} ` +
          `and schedule a renegotiation conversation with the customer's account manager.`;

        try {
          await Promise.all(
            recipients.map((email) =>
              this.emailService.send({
                to: email,
                subject,
                text: body,
              }),
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

  toJsonContract(contract: ContractWithMembers | EnterpriseContract) {
    const memberClinicIds =
      'members' in contract
        ? (contract as ContractWithMembers).members
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
      overageUserCents: contract.overageUserCents,
      overageConsultationCents: contract.overageConsultationCents,
      overageWhatsappCents: contract.overageWhatsappCents,
      overageStorageCents: contract.overageStorageCents,
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
}
