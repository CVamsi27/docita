import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ClaimStatus, ClaimSubmissionStatus, ClaimType } from '@workspace/db';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/prisma/prisma.service';
import { InsuranceClaimDecisionCommandService } from '@/domains/insurance-claims/application/services/insurance-claim-decision.command.service';
import { InsuranceClaimSubmissionCommandService } from '@/domains/insurance-claims/application/services/insurance-claim-submission.command.service';
import { InsuranceClaimsCommandService } from '@/domains/insurance-claims/application/services/insurance-claims-command.service';
import { PrismaInsuranceClaimRepository } from '@/domains/insurance-claims/infrastructure/repositories/prisma.insurance-claim.repository';
import {
  INSURANCE_CLAIM_REPOSITORY_TOKEN,
  type IInsuranceClaimRepository,
} from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import {
  CLAIM_SUBMISSION_GATEWAY_TOKEN,
  type IClaimSubmissionGateway,
} from '@/domains/insurance-claims/application/ports/claim-submission-gateway.port';
import {
  setupTestDatabase,
  resetDatabase,
  getPrismaInstance,
  closeDatabase,
} from '../../setup';
import { factories, setPrismaInstance } from '../../factories';

/**
 * I01 — claim transitions under concurrency, retryable submission, and external
 * decisions linked to provider evidence.
 *
 * The claims that matter here are the ones a unit test cannot establish: that a
 * conditional UPDATE really admits one winner, that the audit event is written
 * or not written atomically with it, and that a lease is respected against real
 * Postgres rather than against a mock.
 */
describe('Insurance claim submission and reconciliation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let submissionService: InsuranceClaimSubmissionCommandService;
  let decisionService: InsuranceClaimDecisionCommandService;
  let commandService: InsuranceClaimsCommandService;
  let repository: IInsuranceClaimRepository;
  let gateway: { submit: jest.Mock };

  beforeAll(async () => {
    setupTestDatabase();

    gateway = { submit: jest.fn(async () => ({ externalReference: 'INS-1' })) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaInstance())
      .overrideProvider(CLAIM_SUBMISSION_GATEWAY_TOKEN)
      .useValue(gateway)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(false);
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    submissionService = moduleFixture.get(
      InsuranceClaimSubmissionCommandService,
    );
    decisionService = moduleFixture.get(InsuranceClaimDecisionCommandService);
    commandService = moduleFixture.get(InsuranceClaimsCommandService);
    repository = moduleFixture.get<IInsuranceClaimRepository>(
      INSURANCE_CLAIM_REPOSITORY_TOKEN,
    );
    setPrismaInstance(prisma);
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    gateway.submit.mockClear();
    gateway.submit.mockResolvedValue({ externalReference: 'INS-1' });
  });

  /** A claim the clinic has already marked SUBMITTED locally. */
  const seedSubmittedClaim = async (
    overrides: { status?: ClaimStatus; version?: number } = {},
  ): Promise<{ claimId: string; clinicId: string }> => {
    const clinic = await factories.clinic();
    const patient = await factories.patient(clinic.id);
    const claim = await prisma.insuranceClaim.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        claimType: ClaimType.REIMBURSEMENT,
        status: overrides.status ?? ClaimStatus.SUBMITTED,
        insurerName: 'Star Health',
        policyNumber: 'POL-1',
        claimedAmountCents: 100000,
        submittedAt: new Date('2026-10-01T00:00:00.000Z'),
        ...(overrides.version !== undefined && { version: overrides.version }),
      },
    });
    return { claimId: claim.id, clinicId: clinic.id };
  };

  /**
   * I01 asks that concurrent and repeated transitions preserve history. The
   * version guard plus the atomic event write are what make that true; a
   * read-then-write would let two callers both write an event.
   */
  describe('transition history', () => {
    it('records exactly one event when two callers transition at the same version', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      const results = await Promise.allSettled([
        commandService.transition(claimId, clinicId, {
          targetStatus: ClaimStatus.APPROVED,
          version: 1,
        }),
        commandService.transition(claimId, clinicId, {
          targetStatus: ClaimStatus.DENIED,
          version: 1,
          denialReason: 'Not covered',
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled).toHaveLength(1);

      // The loser must be told to reload, not silently succeed on stale state.
      const rejected = results.find((r) => r.status === 'rejected');
      expect(rejected).toBeDefined();
      expect(String((rejected as PromiseRejectedResult).reason)).toContain(
        'modified by another request',
      );

      const events = await prisma.insuranceClaimEvent.findMany({
        where: { claimId },
      });
      expect(events).toHaveLength(1);
    });

    it('keeps every successful transition in the history', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      await commandService.transition(claimId, clinicId, {
        targetStatus: ClaimStatus.APPROVED,
        version: 1,
      });
      const afterApproval = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      await commandService.transition(claimId, clinicId, {
        targetStatus: ClaimStatus.SETTLED,
        version: afterApproval.version,
      });

      const events = await prisma.insuranceClaimEvent.findMany({
        where: { claimId },
        orderBy: { createdAt: 'asc' },
      });
      expect(events.map((e) => e.toStatus)).toEqual([
        ClaimStatus.APPROVED,
        ClaimStatus.SETTLED,
      ]);
    });

    it('writes no event when the version guard rejects the transition', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim({ version: 5 });

      await expect(
        commandService.transition(claimId, clinicId, {
          targetStatus: ClaimStatus.APPROVED,
          version: 1,
        }),
      ).rejects.toThrow();

      const events = await prisma.insuranceClaimEvent.findMany({
        where: { claimId },
      });
      expect(events).toHaveLength(0);
    });
  });

  describe('retryable submission', () => {
    it('files the claim once when two callers submit it together', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      const [first, second] = await Promise.all([
        submissionService.submitClaim(claimId, clinicId),
        submissionService.submitClaim(claimId, clinicId),
      ]);

      expect([first, second].sort()).toEqual(['ALREADY_SENT', 'SUBMITTED']);
      expect(gateway.submit).toHaveBeenCalledTimes(1);

      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.SENT);
      expect(row.submissionAttempts).toBe(1);
      expect(row.submittedToInsurerAt).not.toBeNull();
      expect(row.externalClaimReference).toBe('INS-1');
    });

    it('leaves a failed filing outstanding instead of recording it as sent', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      gateway.submit.mockRejectedValue(new Error('insurer unreachable'));

      const outcome = await submissionService.submitClaim(claimId, clinicId);

      expect(outcome).toBe('SUBMISSION_PENDING');
      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.status).toBe(ClaimStatus.SUBMITTED);
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.FAILED);
      expect(row.submissionLastError).toContain('insurer unreachable');
      expect(row.submittedToInsurerAt).toBeNull();
    });

    it('retries a failed filing on the next sweep', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      gateway.submit.mockRejectedValueOnce(new Error('insurer unreachable'));
      await submissionService.submitClaim(claimId, clinicId);
      gateway.submit.mockResolvedValue({ externalReference: 'INS-2' });

      const result = await submissionService.retryPendingSubmissions();

      expect(result.sent).toBe(1);
      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.SENT);
      expect(row.submissionAttempts).toBe(2);
      expect(row.externalClaimReference).toBe('INS-2');
    });

    it('recovers a claim whose sending worker died mid-flight', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
          submissionClaimToken: 'dead-worker',
          submissionClaimedAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });

      const result = await submissionService.retryPendingSubmissions();

      expect(result.sent).toBe(1);
      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.SENT);
    });

    it('does not steal a claim whose send is still live', async () => {
      const { claimId } = await seedSubmittedClaim();
      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
          submissionClaimToken: 'live-worker',
          submissionClaimedAt: new Date(),
        },
      });

      const result = await submissionService.retryPendingSubmissions();

      expect(result.sent).toBe(0);
      expect(gateway.submit).not.toHaveBeenCalled();
      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.submissionClaimToken).toBe('live-worker');
    });

    it('never re-files a claim the insurer already has', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      await submissionService.submitClaim(claimId, clinicId);
      gateway.submit.mockClear();

      const result = await submissionService.retryPendingSubmissions();

      expect(result.attempted).toBe(0);
      expect(gateway.submit).not.toHaveBeenCalled();
    });

    it('never files a claim that predates delivery tracking', async () => {
      // LEGACY_UNVERIFIED is the backfilled state for claims already SUBMITTED
      // when tracking was introduced. Filing them could double-submit.
      const { claimId } = await seedSubmittedClaim();
      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: { submissionStatus: ClaimSubmissionStatus.LEGACY_UNVERIFIED },
      });

      const result = await submissionService.retryPendingSubmissions();

      expect(result.attempted).toBe(0);
      expect(gateway.submit).not.toHaveBeenCalled();
    });

    it('never files a claim the clinic has not submitted', async () => {
      // A DRAFT claim has not been sent anywhere; sweeping it would file a
      // claim the clinician has not finished or approved.
      const { claimId } = await seedSubmittedClaim({
        status: ClaimStatus.DRAFT,
      });

      const result = await submissionService.retryPendingSubmissions();

      expect(result.attempted).toBe(0);
      expect(gateway.submit).not.toHaveBeenCalled();
    });

    it('refuses to file a claim addressed to the wrong clinic', async () => {
      const { claimId } = await seedSubmittedClaim();
      const otherClinic = await factories.clinic();

      // Without the clinic predicate the claim would match on id alone and be
      // filed into another tenant's insurer relationship.
      const claimed = await (
        repository as unknown as {
          claimSubmission: (
            id: string,
            clinicId: string,
            token: string,
            now: Date,
            leaseExpiredBefore: Date,
          ) => Promise<boolean>;
        }
      ).claimSubmission(
        claimId,
        otherClinic.id,
        'cross-tenant',
        new Date(),
        new Date(Date.now() - 10 * 60 * 1000),
      );

      expect(claimed).toBe(false);
      expect(gateway.submit).not.toHaveBeenCalled();
      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.NOT_ATTEMPTED);
    });

    it('ignores a settle sent by a caller whose claim was taken over', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      // A send stalls, its lease expires, a second worker takes over and is
      // mid-send when the first process finally wakes up and reports.
      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          submissionStatus: ClaimSubmissionStatus.IN_FLIGHT,
          submissionClaimToken: 'stale-holder',
          submissionClaimedAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      });
      const tookOver = await (
        repository as unknown as {
          claimSubmission: (
            id: string,
            clinicId: string,
            token: string,
            now: Date,
            leaseExpiredBefore: Date,
          ) => Promise<boolean>;
        }
      ).claimSubmission(
        claimId,
        clinicId,
        'rescuer',
        new Date(),
        new Date(Date.now() - 10 * 60 * 1000),
      );
      expect(tookOver).toBe(true);

      await (
        repository as unknown as {
          settleSubmission: (
            id: string,
            clinicId: string,
            token: string,
            outcome: Record<string, unknown>,
          ) => Promise<void>;
        }
      ).settleSubmission(claimId, clinicId, 'stale-holder', {
        status: ClaimSubmissionStatus.SENT,
        now: new Date(),
      });

      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      // The winner keeps its claim and its in-flight state.
      expect(row.submissionStatus).toBe(ClaimSubmissionStatus.IN_FLIGHT);
      expect(row.submissionClaimToken).toBe('rescuer');
      expect(row.submittedToInsurerAt).toBeNull();
    });
  });

  describe('external reconciliation', () => {
    it('links an insurer denial to the evidence it supplied', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      await decisionService.recordInsurerDecision(claimId, clinicId, {
        targetStatus: ClaimStatus.DENIED,
        externalReference: 'INS-DENY-7',
        providerCode: 'CO-16',
        denialReason: 'Not covered under policy',
        expectedVersion: 1,
      });

      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.status).toBe(ClaimStatus.DENIED);
      expect(row.externalClaimReference).toBe('INS-DENY-7');

      const event = await prisma.insuranceClaimEvent.findFirstOrThrow({
        where: { claimId },
      });
      expect(event.source).toBe('INSURER_RESPONSE');
      expect(event.externalReference).toBe('INS-DENY-7');
      expect(event.providerCode).toBe('CO-16');
      expect(event.decidedAt).not.toBeNull();
    });

    it('distinguishes an insurer decision from a local one', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      await commandService.transition(claimId, clinicId, {
        targetStatus: ClaimStatus.APPROVED,
        version: 1,
      });

      const events = await prisma.insuranceClaimEvent.findMany({
        where: { claimId },
      });
      // Typed by a clinic user: no insurer evidence behind it.
      expect(events[0].source).toBe('LOCAL_ACTION');
      expect(events[0].externalReference).toBeNull();
    });

    it('refuses a decision with no insurer reference', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();

      await expect(
        decisionService.recordInsurerDecision(claimId, clinicId, {
          targetStatus: ClaimStatus.DENIED,
          externalReference: '',
          denialReason: 'Not covered',
          expectedVersion: 1,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const row = await prisma.insuranceClaim.findUniqueOrThrow({
        where: { id: claimId },
      });
      expect(row.status).toBe(ClaimStatus.SUBMITTED);
    });

    it('refuses to reconcile a decision against a stale version', async () => {
      const { claimId, clinicId } = await seedSubmittedClaim();
      await commandService.transition(claimId, clinicId, {
        targetStatus: ClaimStatus.APPROVED,
        version: 1,
      });

      await expect(
        decisionService.recordInsurerDecision(claimId, clinicId, {
          targetStatus: ClaimStatus.SETTLED,
          externalReference: 'INS-SETTLE-1',
          expectedVersion: 1,
        }),
      ).rejects.toThrow('modified by another request');
    });
  });
});
