import { EnterpriseContractStatus } from '@workspace/db';
import type { EnterpriseContractPersistencePort } from '@/domains/enterprise-contracts/application/ports/enterprise-contract-persistence.port';
import { EnterpriseContractsCommandService } from './enterprise-contracts-command.service';
import type { IClock } from '@/shared/common/ports/clock.port';

/**
 * E01 clause 1: member add/remove used to write `snapshot: {}`, so a revision
 * recorded only that a clinic joined or left — not the entitlement it held at
 * that moment. These tests pin the terms + member set onto the revision so
 * historical billing stays reconstructable.
 */
const contract = {
  id: 'contract-1',
  primaryClinicId: 'clinic-primary',
  contractNumber: 'ENT-001',
  status: EnterpriseContractStatus.ACTIVE,
  startDate: new Date('2026-06-01T00:00:00.000Z'),
  endDate: new Date('2027-05-31T00:00:00.000Z'),
  billingCycle: 'MONTHLY',
  currency: 'INR',
  platformFeeCents: 50_000_00,
  setupFeeCents: 2_500_00,
  annualPrepayDiscountPercent: 10,
  trueUpThresholdPercent: 130,
  includedUsers: 25,
  includedConsultations: 500,
  includedWhatsappMessages: 1_000,
  includedStorageGB: 40,
  includedBranches: 3,
  includedDoctors: 5,
  includedPrescriptions: 400,
  includedInvoices: 200,
};

function createService(options?: {
  members?: { contractId: string; clinicId: string; removedAt: Date | null }[];
  existingMember?: { contractId: string } | null;
  clinicExists?: boolean;
}) {
  const members = options?.members ?? [
    { contractId: 'contract-1', clinicId: 'clinic-primary', removedAt: null },
  ];
  const enterpriseContractRevisionCreate = jest.fn(
    async (_args: RevisionCreateArgs) => ({ id: 'rev-1' }),
  );

  const memberDelegate = {
    // Mirrors the real delegate: `removedAt: null` is filtered by the database,
    // so the mock has to apply it too or the assertion would prove nothing.
    findMany: jest.fn(async (args?: { where?: { removedAt?: Date | null } }) =>
      args?.where?.removedAt === null
        ? members.filter((m) => m.removedAt === null)
        : members,
    ),
    findUnique: jest.fn(async () => options?.existingMember ?? null),
    upsert: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
  };

  const tx = {
    enterpriseContractMember: memberDelegate,
    enterpriseContractRevision: { create: enterpriseContractRevisionCreate },
    enterpriseContract: {
      update: jest.fn(async () => ({})),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'contract-1' })),
    },
    subscription: { updateMany: jest.fn(async () => ({ count: 1 })) },
  };

  const persistence = {
    runUnrestricted: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    clinic: {
      findUnique: jest.fn(async () =>
        options?.clinicExists === false ? null : { id: 'clinic-new' },
      ),
    },
    enterpriseContract: {
      findUnique: jest.fn(async () => contract),
      findUniqueOrThrow: jest.fn(async () => ({ id: 'contract-1' })),
    },
    enterpriseContractMember: memberDelegate,
    enterpriseContractRevision: { create: enterpriseContractRevisionCreate },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  } as unknown as EnterpriseContractPersistencePort;

  const service = new EnterpriseContractsCommandService(
    {} as never,
    persistence,
    {} as never,
    {} as never,
    { now: () => new Date('2026-07-01T00:00:00.000Z') } satisfies IClock,
  );

  return { service, enterpriseContractRevisionCreate, memberDelegate };
}

type RevisionCreateArgs = { data: { snapshot: unknown } };

/**
 * `snapshot` is persisted as Prisma JSON, so it arrives as an opaque value; the
 * assertions read it back through a structural narrow rather than assuming a
 * shape, which keeps this independent of the mock's inferred generic.
 */
function snapshotOf(create: {
  mock: { calls: [RevisionCreateArgs, ...unknown[]][] };
}): Record<string, unknown> {
  return create.mock.calls[0][0].data.snapshot as Record<string, unknown>;
}

describe('EnterpriseContractsCommandService membership revisions', () => {
  describe('addMember', () => {
    it('snapshots the entitlement state including the clinic just added', async () => {
      const { service, enterpriseContractRevisionCreate } = createService({
        members: [
          {
            contractId: 'contract-1',
            clinicId: 'clinic-primary',
            removedAt: null,
          },
          { contractId: 'contract-1', clinicId: 'clinic-new', removedAt: null },
        ],
      });

      await service.addMember('contract-1', 'clinic-new', 'user-1');

      const snapshot = snapshotOf(enterpriseContractRevisionCreate);
      expect(snapshot).toMatchObject({
        change: 'ADDED',
        changedClinicId: 'clinic-new',
        memberClinicIds: ['clinic-primary', 'clinic-new'],
      });
      expect(snapshot.terms).toMatchObject({
        contractNumber: 'ENT-001',
        platformFeeCents: 50_000_00,
        currency: 'INR',
        annualPrepayDiscountPercent: 10,
        trueUpThresholdPercent: 130,
        included: { users: 25, consultations: 500, invoices: 200 },
      });
    });

    it('no longer writes an empty snapshot', async () => {
      const { service, enterpriseContractRevisionCreate } = createService({
        members: [
          {
            contractId: 'contract-1',
            clinicId: 'clinic-primary',
            removedAt: null,
          },
          { contractId: 'contract-1', clinicId: 'clinic-new', removedAt: null },
        ],
      });

      await service.addMember('contract-1', 'clinic-new', 'user-1');

      expect(snapshotOf(enterpriseContractRevisionCreate)).not.toEqual({});
    });

    it('snapshots only active members, excluding clinics that already exited', async () => {
      const { service, enterpriseContractRevisionCreate } = createService({
        members: [
          {
            contractId: 'contract-1',
            clinicId: 'clinic-primary',
            removedAt: null,
          },
          {
            contractId: 'contract-1',
            clinicId: 'clinic-exited',
            removedAt: new Date('2026-06-15T00:00:00.000Z'),
          },
          { contractId: 'contract-1', clinicId: 'clinic-new', removedAt: null },
        ],
      });

      await service.addMember('contract-1', 'clinic-new', 'user-1');

      expect(
        snapshotOf(enterpriseContractRevisionCreate).memberClinicIds,
      ).toEqual(['clinic-primary', 'clinic-new']);
    });
  });

  describe('removeMember', () => {
    it('snapshots the remaining entitlement state after the clinic leaves', async () => {
      const { service, enterpriseContractRevisionCreate } = createService({
        members: [
          {
            contractId: 'contract-1',
            clinicId: 'clinic-primary',
            removedAt: null,
          },
        ],
      });

      await service.removeMember('contract-1', 'clinic-new', 'user-1');

      const snapshot = snapshotOf(enterpriseContractRevisionCreate);
      expect(snapshot).toMatchObject({
        change: 'REMOVED',
        changedClinicId: 'clinic-new',
        memberClinicIds: ['clinic-primary'],
      });
      expect(snapshot.terms).toMatchObject({ contractNumber: 'ENT-001' });
    });

    it('no longer writes an empty snapshot', async () => {
      const { service, enterpriseContractRevisionCreate } = createService({
        members: [
          {
            contractId: 'contract-1',
            clinicId: 'clinic-primary',
            removedAt: null,
          },
        ],
      });

      await service.removeMember('contract-1', 'clinic-new', 'user-1');

      expect(snapshotOf(enterpriseContractRevisionCreate)).not.toEqual({});
    });
  });
});
