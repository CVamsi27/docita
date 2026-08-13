import { EnterpriseContractStatus, Role, UsageType } from '@workspace/db';
import type { EnterpriseContractPersistencePort } from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import {
  EnterpriseContractsQueryService,
  type ContractWithMembers,
} from './enterprise-contracts-query.service';
import { currentCalendarMonthPeriod } from './enterprise-contracts-estimate.helpers';
import type { IClock } from '@/shared/common/ports/clock.port';

// currentCalendarMonthPeriod builds local-time month bounds (new Date(y, m,
// 1)), so expected instants depend on the runner's TZ. Derive them from the
// same helper the service uses rather than hardcoding UTC literals.
const FIXED_NOW = new Date('2026-06-15T10:30:00.000Z');
const { periodStart, periodEnd } = currentCalendarMonthPeriod(FIXED_NOW);

const BASE_CONTRACT = {
  id: 'contract-1',
  primaryClinicId: 'clinic-1',
  groupName: 'Group One',
  contractNumber: 'ENT-001',
  status: EnterpriseContractStatus.ACTIVE,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  endDate: new Date('2026-12-31T00:00:00.000Z'),
  billingCycle: 'MONTHLY',
  currency: 'INR',
  platformFeeCents: 50_000_00,
  includedUsers: 10,
  includedConsultations: 200,
  includedWhatsappMessages: 500,
  includedStorageGB: 50,
  includedBranches: 2,
  includedDoctors: 5,
  includedPrescriptions: 300,
  includedInvoices: 100,
  overageUserCents: 5_00,
  overageConsultationCents: 15_00,
  overageWhatsappCents: 2_00,
  overageStorageCents: 1_00,
  overageDoctorCents: 20_00,
  overagePrescriptionCents: 10_00,
  overageInvoiceCents: 8_00,
  setupFeeCents: 2_500_00,
  dedicatedSupportCents: 5_000_00,
  customLineItems: [
    {
      key: 'migration_support',
      label: 'Migration support',
      includedQty: 1,
      unitCents: 10_000_00,
      source: 'MANUAL',
      enabled: true,
    },
  ],
  annualPrepayDiscountPercent: 10,
  trueUpThresholdPercent: 130,
  notes: 'Signed Q1',
  signedDocumentUrl: 'https://docs.docita.work/ent-001.pdf',
  lastTrueUpAlertAt: new Date('2026-06-01T00:00:00.000Z'),
  annualPrepayInvoiceId: 'inv-prepay-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-15T00:00:00.000Z'),
};

const MEMBERS: ContractWithMembers['members'] = [
  { id: 'm-1', clinicId: 'clinic-1', joinedAt: new Date(), removedAt: null },
  { id: 'm-2', clinicId: 'clinic-2', joinedAt: new Date(), removedAt: null },
  {
    id: 'm-3',
    clinicId: 'clinic-3',
    joinedAt: new Date(),
    removedAt: new Date(),
  },
];

function createService(opts?: {
  contract?: ContractWithMembers | null;
  members?: ContractWithMembers['members'];
  now?: Date;
}) {
  const contract =
    opts && 'contract' in opts
      ? opts.contract
      : {
          ...BASE_CONTRACT,
          members: opts?.members ?? MEMBERS,
        };
  const members = opts?.members ?? MEMBERS;

  const enterpriseContractFindMany = jest.fn(async () => [contract]);
  const enterpriseContractFindUnique = jest.fn(async () => contract);
  const enterpriseContractFindFirst = jest.fn(async () => contract);
  const enterpriseContractMemberFindUnique = jest.fn(async () =>
    members.length > 0 ? { id: 'm-1', contractId: 'contract-1' } : null,
  );
  const enterpriseContractRevisionFindMany = jest.fn(async () => [
    { id: 'rev-2', contractId: 'contract-1', effectiveDate: new Date() },
  ]);
  const enterpriseContractInvoiceFindMany = jest.fn(async () => [
    { id: 'inv-1', contractId: 'contract-1' },
  ]);
  const enterpriseTrueUpAlertFindMany = jest.fn(async () => [
    { id: 'alert-1', contractId: 'contract-1' },
  ]);
  const appointmentCount = jest.fn(async () => 25);
  const userCount = jest.fn(async () => 12);
  const doctorClinicCount = jest.fn(async () => 6);
  const usageEventAggregate = jest.fn(
    async ({
      where,
      _sum,
    }: {
      where?: { clinicId?: unknown; type?: unknown; timestamp?: unknown };
      _sum?: unknown;
    } = {}) => {
      void where;
      const field = Object.keys(
        (_sum ?? { quantity: null }) as { quantity?: null },
      )[0];
      return { _sum: { [field]: 50 } };
    },
  );
  const runUnrestricted = jest.fn(
    async <T>(fn: () => Promise<T>): Promise<T> => fn(),
  );

  const persistence = {
    runUnrestricted,
    enterpriseContract: {
      findMany: enterpriseContractFindMany,
      findUnique: enterpriseContractFindUnique,
      findFirst: enterpriseContractFindFirst,
    },
    enterpriseContractMember: {
      findUnique: enterpriseContractMemberFindUnique,
    },
    enterpriseContractRevision: {
      findMany: enterpriseContractRevisionFindMany,
    },
    enterpriseContractInvoice: {
      findMany: enterpriseContractInvoiceFindMany,
    },
    enterpriseTrueUpAlert: {
      findMany: enterpriseTrueUpAlertFindMany,
    },
    appointment: { count: appointmentCount },
    user: { count: userCount },
    doctorClinic: { count: doctorClinicCount },
    usageEvent: { aggregate: usageEventAggregate },
  } as unknown as EnterpriseContractPersistencePort;

  const clock = {
    now: () => opts?.now ?? new Date('2026-06-15T10:30:00.000Z'),
  } satisfies IClock;

  const service = new EnterpriseContractsQueryService(persistence, clock);

  return {
    service,
    persistence,
    enterpriseContractFindMany,
    enterpriseContractFindUnique,
    enterpriseContractFindFirst,
    enterpriseContractMemberFindUnique,
    enterpriseContractRevisionFindMany,
    enterpriseContractInvoiceFindMany,
    enterpriseTrueUpAlertFindMany,
    appointmentCount,
    userCount,
    doctorClinicCount,
    usageEventAggregate,
    runUnrestricted,
  };
}

describe('EnterpriseContractsQueryService', () => {
  describe('list', () => {
    it('returns contracts with members, newest first, capped at 500', async () => {
      const { service, enterpriseContractFindMany, runUnrestricted } =
        createService();

      const result = await service.list();

      expect(result).toHaveLength(1);
      expect(enterpriseContractFindMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
        include: { members: true },
        take: 500,
      });
      expect(runUnrestricted).toHaveBeenCalled();
    });
  });

  describe('getForClinicId', () => {
    it('resolves via member record when the clinic is a member', async () => {
      const {
        service,
        enterpriseContractMemberFindUnique,
        enterpriseContractFindUnique,
      } = createService();

      const result = await service.getForClinicId('clinic-2');

      expect(enterpriseContractMemberFindUnique).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-2' },
      });
      expect(enterpriseContractFindUnique).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        include: { members: true },
      });
      expect(result).toMatchObject({ id: 'contract-1' });
    });

    it('falls back to primaryClinicId when the clinic is not a member', async () => {
      const { service, enterpriseContractFindFirst } = createService({
        members: [],
      });

      await service.getForClinicId('clinic-9');

      expect(enterpriseContractFindFirst).toHaveBeenCalledWith({
        where: { primaryClinicId: 'clinic-9' },
        include: { members: true },
      });
    });

    it('returns null when nothing covers the clinic', async () => {
      const { service } = createService({
        members: [],
        contract: null,
      });

      await expect(service.getForClinicId('clinic-9')).resolves.toBeNull();
    });
  });

  describe('getByContractId', () => {
    it('returns the contract with members', async () => {
      const { service, enterpriseContractFindUnique } = createService();

      await service.getByContractId('contract-1');

      expect(enterpriseContractFindUnique).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        include: { members: true },
      });
    });

    it('returns null for an unknown contract', async () => {
      const { service } = createService({ contract: null });

      await expect(service.getByContractId('nope')).resolves.toBeNull();
    });
  });

  describe('getActiveForClinicId', () => {
    it('returns the contract when ACTIVE', async () => {
      const { service } = createService();

      const result = await service.getActiveForClinicId('clinic-2');
      expect(result).toMatchObject({ id: 'contract-1' });
    });

    it('returns null when the contract is not ACTIVE', async () => {
      const { service } = createService({
        contract: {
          ...BASE_CONTRACT,
          status: EnterpriseContractStatus.TERMINATED,
          members: MEMBERS,
        } as ContractWithMembers,
      });

      await expect(
        service.getActiveForClinicId('clinic-2'),
      ).resolves.toBeNull();
    });

    it('returns null when no contract covers the clinic', async () => {
      const { service } = createService({ contract: null, members: [] });

      await expect(
        service.getActiveForClinicId('clinic-9'),
      ).resolves.toBeNull();
    });
  });

  describe('listRevisions / listInvoices / listTrueUpAlerts', () => {
    it('lists revisions newest-first, unbounded but scoped to contract', async () => {
      const { service, enterpriseContractRevisionFindMany } = createService();

      await service.listRevisions('contract-1');

      expect(enterpriseContractRevisionFindMany).toHaveBeenCalledWith({
        where: { contractId: 'contract-1' },
        orderBy: { effectiveDate: 'desc' },
      });
    });

    it('lists invoices newest-first with payment, capped at 500', async () => {
      const { service, enterpriseContractInvoiceFindMany } = createService();

      await service.listInvoices('contract-1');

      expect(enterpriseContractInvoiceFindMany).toHaveBeenCalledWith({
        where: { contractId: 'contract-1' },
        orderBy: { createdAt: 'desc' },
        include: { subscriptionPayment: true },
        take: 500,
      });
    });

    it('lists true-up alerts newest-first, scoped to contract', async () => {
      const { service, enterpriseTrueUpAlertFindMany } = createService();

      await service.listTrueUpAlerts('contract-1');

      expect(enterpriseTrueUpAlertFindMany).toHaveBeenCalledWith({
        where: { contractId: 'contract-1' },
        orderBy: { alertedAt: 'desc' },
      });
    });
  });

  describe('estimateCurrentPeriod', () => {
    it('returns null when the contract is missing', async () => {
      const { service } = createService({ contract: null });

      await expect(
        service.estimateCurrentPeriod('contract-1'),
      ).resolves.toBeNull();
    });

    it('returns null when the contract is not ACTIVE', async () => {
      const { service } = createService({
        contract: {
          ...BASE_CONTRACT,
          status: EnterpriseContractStatus.EXPIRED,
          members: MEMBERS,
        } as ContractWithMembers,
      });

      await expect(
        service.estimateCurrentPeriod('contract-1'),
      ).resolves.toBeNull();
    });

    it('returns null when there are no active member clinics', async () => {
      const { service } = createService({
        members: [{ ...MEMBERS[0], removedAt: new Date() }],
      });

      await expect(
        service.estimateCurrentPeriod('contract-1'),
      ).resolves.toBeNull();
    });

    it('scopes every aggregate to active member clinics and the calendar month', async () => {
      const {
        service,
        appointmentCount,
        userCount,
        doctorClinicCount,
        usageEventAggregate,
      } = createService();

      await service.estimateCurrentPeriod('contract-1');

      expect(appointmentCount).toHaveBeenCalledWith({
        where: {
          clinicId: { in: ['clinic-1', 'clinic-2'] },
          status: 'COMPLETED',
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      });
      expect(userCount).toHaveBeenCalledWith({
        where: {
          clinicId: { in: ['clinic-1', 'clinic-2'] },
          NOT: {
            AND: [{ role: Role.DOCTOR }, { appLoginDisabled: true }],
          },
        },
      });
      expect(doctorClinicCount).toHaveBeenCalledWith({
        where: { clinicId: { in: ['clinic-1', 'clinic-2'] }, active: true },
      });

      // 4 usage-type aggregates: whatsapp, storage, prescriptions, invoices.
      const aggregateCalls = usageEventAggregate.mock.calls.map(
        (call) => call[0]?.where,
      );
      expect(aggregateCalls).toHaveLength(4);
      const withWhere = aggregateCalls.filter(
        (w): w is NonNullable<typeof w> => w !== undefined,
      );
      for (const where of withWhere) {
        expect(where.clinicId).toEqual({ in: ['clinic-1', 'clinic-2'] });
        expect(where.timestamp).toEqual({ gte: periodStart, lte: periodEnd });
      }
      const types = withWhere.map((where) => where.type);
      expect(types).toEqual([
        UsageType.WHATSAPP_MESSAGES,
        UsageType.STORAGE_GB,
        UsageType.PRESCRIPTIONS,
        UsageType.INVOICES,
      ]);
    });

    it('builds meters with overage math and totals', async () => {
      const { service } = createService();

      const result = await service.estimateCurrentPeriod('contract-1');

      expect(result).not.toBeNull();
      expect(result?.meters.users).toEqual({
        current: 12,
        included: 10,
        overage: 2,
        chargeCents: 2 * 5_00,
      });
      expect(result?.meters.consultations).toEqual({
        current: 25,
        included: 200,
        overage: 0,
        chargeCents: 0,
      });
      // 50 usage events across the 4 usage meters (all within included
      // quantities -> 0 charge).
      expect(result?.meters.whatsappMessages.overage).toBe(0);
      expect(result?.meters.prescriptions.chargeCents).toBe(0);
      // Overages: users 12-10=2 x 500c + doctors 6-5=1 x 2000c.
      expect(result?.meters.doctors).toEqual({
        current: 6,
        included: 5,
        overage: 1,
        chargeCents: 20_00,
      });
      expect(result?.overageTotalCents).toBe(2 * 5_00 + 20_00);
      // projected = platform + dedicated support + overage.
      expect(result?.projectedMonthTotalCents).toBe(
        50_000_00 + 5_000_00 + 2 * 5_00 + 20_00,
      );
      expect(result?.period).toEqual({
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      });
      expect(result?.currency).toBe('INR');
      expect(result?.contract.memberClinicIds).toEqual([
        'clinic-1',
        'clinic-2',
      ]);
    });
  });

  describe('previewCurrentPeriodInvoice', () => {
    it('returns null when there is no current estimate', async () => {
      const { service } = createService({ contract: null });

      await expect(
        service.previewCurrentPeriodInvoice('contract-1'),
      ).resolves.toBeNull();
    });

    it('always includes the platform fee and drops zero-charge lines', async () => {
      const { service } = createService();

      const result = await service.previewCurrentPeriodInvoice('contract-1');
      expect(result).not.toBeNull();

      const keys = result?.lines.map((l) => l.key);
      // consultations overage 0 -> dropped; whatsapp/storage/prescriptions
      // usage meters with charge 0 -> dropped. Platform fee kept even at
      // positive charge; dedicated support kept.
      expect(keys).toContain('platform_fee');
      expect(keys).toContain('dedicated_support');
      expect(keys).toContain('users');
      expect(keys).not.toContain('consultations');
      expect(keys).not.toContain('whatsappMessages');
      expect(keys).not.toContain('storageGB');
      expect(keys).not.toContain('prescriptions');
      expect(keys).not.toContain('invoices');

      const platform = result?.lines.find((l) => l.key === 'platform_fee');
      expect(platform?.chargeCents).toBe(50_000_00);
      expect(platform?.source).toBe('SYSTEM');

      const users = result?.lines.find((l) => l.key === 'users');
      expect(users?.label).toBe('Users');
      expect(users?.unitCents).toBe(5_00);
      expect(users?.chargeCents).toBe(10_00);

      expect(result?.subtotalCents).toBe(result?.totalCents);
      expect(result?.taxCents).toBe(0);
    });

    it('drops dedicated support when it is zero', async () => {
      const { service } = createService({
        contract: {
          ...BASE_CONTRACT,
          dedicatedSupportCents: 0,
          members: MEMBERS,
        } as ContractWithMembers,
      });

      const result = await service.previewCurrentPeriodInvoice('contract-1');
      const keys = result?.lines.map((l) => l.key);
      expect(keys).not.toContain('dedicated_support');
    });
  });

  describe('activeMemberClinicIds / toJsonContract / parseCustomLineItems', () => {
    it('returns only non-removed member clinic ids', () => {
      const { service } = createService();

      expect(
        service.activeMemberClinicIds({
          ...BASE_CONTRACT,
          members: MEMBERS,
        } as ContractWithMembers),
      ).toEqual(['clinic-1', 'clinic-2']);
    });

    it('serializes a contract with members to its JSON shape', () => {
      const { service } = createService();

      const json = service.toJsonContract({
        ...BASE_CONTRACT,
        members: MEMBERS,
      } as ContractWithMembers);

      expect(json.id).toBe('contract-1');
      expect(json.memberClinicIds).toEqual(['clinic-1', 'clinic-2']);
      expect(json.startDate).toBe('2026-01-01T00:00:00.000Z');
      expect(json.lastTrueUpAlertAt).toBe('2026-06-01T00:00:00.000Z');
      expect(json.customLineItems).toEqual([
        {
          key: 'migration_support',
          label: 'Migration support',
          includedQty: 1,
          unitCents: 10_000_00,
          source: 'MANUAL',
          enabled: true,
        },
      ]);
      expect(json).toMatchObject({
        primaryClinicId: 'clinic-1',
        contractNumber: 'ENT-001',
        platformFeeCents: 50_000_00,
        includedUsers: 10,
        overageUserCents: 5_00,
        annualPrepayDiscountPercent: 10,
      });
    });

    it('serializes a contract without members (empty clinic ids, null alert)', () => {
      const { service } = createService();

      const json = service.toJsonContract({
        ...BASE_CONTRACT,
        lastTrueUpAlertAt: null,
      } as unknown as ContractWithMembers);

      expect(json.memberClinicIds).toEqual([]);
      expect(json.lastTrueUpAlertAt).toBeNull();
    });

    it('parses valid custom line items and falls back to [] for junk', () => {
      const { service } = createService();

      // Zod fills schema defaults (source: USAGE_RECORD, enabled: true).
      expect(
        service.parseCustomLineItems([
          { key: 'k1', label: 'K1', includedQty: 1, unitCents: 0 },
        ]),
      ).toEqual([
        {
          key: 'k1',
          label: 'K1',
          includedQty: 1,
          unitCents: 0,
          source: 'USAGE_RECORD',
          enabled: true,
        },
      ]);
      expect(service.parseCustomLineItems('not-an-array')).toEqual([]);
      expect(service.parseCustomLineItems(null)).toEqual([]);
    });
  });
});
