import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ClaimEventSource,
  ClaimStatus,
  ClaimSubmissionStatus,
  ClaimType,
} from '@workspace/db';
import { InsuranceClaimDecisionCommandService } from './insurance-claim-decision.command.service';
import { InsuranceClaimSubmissionCommandService } from './insurance-claim-submission.command.service';
import type { IInsuranceClaimRepository } from '@/domains/insurance-claims/core/repositories/insurance-claim.repository';
import type { IClaimSubmissionGateway } from '@/domains/insurance-claims/application/ports/claim-submission-gateway.port';
import { createFixedClockMock } from '@/test-utils';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-10-03T12:00:00.000Z');

const buildClaim = (overrides: Record<string, unknown> = {}) => ({
  id: 'claim-1',
  claimNumber: 'CLM-1',
  claimType: ClaimType.REIMBURSEMENT,
  status: ClaimStatus.SUBMITTED,
  patientId: 'patient-1',
  clinicId: 'clinic-1',
  appointmentId: null,
  invoiceId: 'invoice-1',
  parentClaimId: null,
  insurerName: 'Star Health',
  tpaName: null,
  policyNumber: 'POL-1',
  groupNumber: null,
  currency: 'INR',
  claimedAmountCents: 100000,
  approvedAmountCents: null,
  patientResponsibilityCents: null,
  submittedAt: new Date('2026-10-01T00:00:00.000Z'),
  respondedAt: null,
  settledAt: null,
  notes: null,
  denialReason: null,
  submissionStatus: ClaimSubmissionStatus.NOT_ATTEMPTED,
  submissionAttempts: 0,
  submissionClaimedAt: null,
  submittedToInsurerAt: null,
  submissionLastError: null,
  externalClaimReference: null,
  version: 3,
  createdAt: NOW,
  updatedAt: NOW,
  patient: {
    id: 'patient-1',
    firstName: 'Asha',
    lastName: 'Rao',
    phoneNumber: '+919888888888',
  },
  ...overrides,
});

describe('Insurance claim submission and decision commands', () => {
  const clock: IClock = createFixedClockMock(NOW.toISOString());

  const claimSubmissionMock =
    jest.fn<IInsuranceClaimRepository['claimSubmission']>();
  const settleSubmissionMock =
    jest.fn<IInsuranceClaimRepository['settleSubmission']>();
  const findPendingSubmissionsMock =
    jest.fn<IInsuranceClaimRepository['findPendingSubmissions']>();
  const findByIdMock = jest.fn<IInsuranceClaimRepository['findById']>();
  const transitionMock = jest.fn<IInsuranceClaimRepository['transition']>();
  const submitMock = jest.fn<IClaimSubmissionGateway['submit']>();

  const repository = {
    claimSubmission: claimSubmissionMock,
    settleSubmission: settleSubmissionMock,
    findPendingSubmissions: findPendingSubmissionsMock,
    findById: findByIdMock,
    transition: transitionMock,
  } as unknown as IInsuranceClaimRepository;

  const gateway = { submit: submitMock } as unknown as IClaimSubmissionGateway;

  let service: InsuranceClaimSubmissionCommandService;
  let decisionService: InsuranceClaimDecisionCommandService;

  beforeEach(() => {
    jest.clearAllMocks();
    claimSubmissionMock.mockResolvedValue(true);
    settleSubmissionMock.mockResolvedValue(undefined);
    findByIdMock.mockResolvedValue(buildClaim() as never);
    submitMock.mockResolvedValue({ externalReference: 'INS-REF-1' });
    service = new InsuranceClaimSubmissionCommandService(
      repository,
      gateway,
      clock,
    );
    decisionService = new InsuranceClaimDecisionCommandService(
      repository,
      clock,
    );
  });

  describe('submitClaim', () => {
    it('files the claim once and records the insurer reference', async () => {
      const outcome = await service.submitClaim('claim-1', 'clinic-1');

      expect(outcome).toBe('SUBMITTED');
      expect(submitMock).toHaveBeenCalledTimes(1);
      expect(settleSubmissionMock).toHaveBeenCalledWith(
        'claim-1',
        'clinic-1',
        expect.any(String),
        expect.objectContaining({
          status: 'SENT',
          externalReference: 'INS-REF-1',
        }),
      );
    });

    it('sends the insurer what it needs to identify the claim', async () => {
      await service.submitClaim('claim-1', 'clinic-1');

      const payload = submitMock.mock.calls[0] as unknown as [
        {
          insurerName: string;
          policyNumber: string;
          claimedAmountCents: number;
        },
      ];
      expect(payload[0].insurerName).toBe('Star Health');
      expect(payload[0].policyNumber).toBe('POL-1');
      expect(payload[0].claimedAmountCents).toBe(100000);
    });

    /**
     * The defect this item exists for: SUBMITTED previously meant only "marked
     * submitted locally", so a failed filing and a successful one looked the
     * same and nothing retried.
     */
    it('leaves a failed filing retryable rather than recorded as sent', async () => {
      submitMock.mockRejectedValue(new Error('insurer unreachable'));

      const outcome = await service.submitClaim('claim-1', 'clinic-1');

      expect(outcome).toBe('SUBMISSION_PENDING');
      expect(settleSubmissionMock).toHaveBeenCalledWith(
        'claim-1',
        'clinic-1',
        expect.any(String),
        expect.objectContaining({
          status: 'FAILED',
          error: 'insurer unreachable',
        }),
      );
    });

    it('does not file when another caller already holds the claim', async () => {
      claimSubmissionMock.mockResolvedValue(false);

      const outcome = await service.submitClaim('claim-1', 'clinic-1');

      expect(outcome).toBe('ALREADY_SENT');
      expect(submitMock).not.toHaveBeenCalled();
    });

    it('refuses to file a claim that is not in SUBMITTED', async () => {
      claimSubmissionMock.mockResolvedValue(false);
      findByIdMock.mockResolvedValue(buildClaim({ status: ClaimStatus.DRAFT }));

      const outcome = await service.submitClaim('claim-1', 'clinic-1');

      expect(outcome).toBe('NOT_ELIGIBLE');
      expect(submitMock).not.toHaveBeenCalled();
    });

    it('throws when the claim does not exist', async () => {
      claimSubmissionMock.mockResolvedValue(false);
      findByIdMock.mockResolvedValue(null);

      await expect(service.submitClaim('nope', 'clinic-1')).rejects.toThrow(
        'Insurance claim nope not found',
      );
    });
  });

  describe('retryPendingSubmissions', () => {
    it('files claims that were left undelivered', async () => {
      findPendingSubmissionsMock.mockResolvedValue([
        { id: 'claim-1', clinicId: 'clinic-1', submissionAttempts: 0 },
      ]);

      const result = await service.retryPendingSubmissions();

      expect(result).toEqual({
        attempted: 1,
        sent: 1,
        failed: 0,
        abandoned: 0,
      });
      expect(submitMock).toHaveBeenCalledTimes(1);
    });

    it('carries the owning clinic, not an empty one, for the claim it files', async () => {
      findPendingSubmissionsMock.mockResolvedValue([
        {
          id: 'claim-1',
          clinicId: 'clinic-from-patient',
          submissionAttempts: 0,
        },
      ]);

      await service.retryPendingSubmissions();

      // The sweep has no authenticated clinic; passing an empty one would make
      // every ownership filter miss and the claim would never be found.
      expect(findByIdMock).toHaveBeenCalledWith(
        'claim-1',
        'clinic-from-patient',
      );
    });

    it('stops retrying a claim that has exhausted its attempts', async () => {
      findPendingSubmissionsMock.mockResolvedValue([
        {
          id: 'claim-1',
          clinicId: 'clinic-1',
          // The ceiling is pinned to a literal, not read from the constant, so
          // raising MAX_CLAIM_SUBMISSION_ATTEMPTS fails this test rather than
          // silently making it vacuous.
          submissionAttempts: 5,
        },
      ]);

      const result = await service.retryPendingSubmissions();

      expect(result.abandoned).toBe(1);
      expect(submitMock).not.toHaveBeenCalled();
    });

    it('counts a failure without giving up the claim', async () => {
      findPendingSubmissionsMock.mockResolvedValue([
        { id: 'claim-1', clinicId: 'clinic-1', submissionAttempts: 1 },
      ]);
      submitMock.mockRejectedValue(new Error('gateway down'));

      const result = await service.retryPendingSubmissions();

      expect(result).toEqual({
        attempted: 1,
        sent: 0,
        failed: 1,
        abandoned: 0,
      });
    });

    it('skips a claim another worker claimed first', async () => {
      findPendingSubmissionsMock.mockResolvedValue([
        { id: 'claim-1', clinicId: 'clinic-1', submissionAttempts: 0 },
      ]);
      claimSubmissionMock.mockResolvedValue(false);

      const result = await service.retryPendingSubmissions();

      expect(result.sent).toBe(0);
      expect(submitMock).not.toHaveBeenCalled();
    });
  });

  /**
   * The defect this item exists for: a denial typed by a clinic user was
   * recorded in the audit trail exactly like one the insurer decided.
   */
  describe('recordInsurerDecision', () => {
    it('links a denial to the reference the insurer supplied', async () => {
      transitionMock.mockResolvedValue(buildClaim() as never);

      await decisionService.recordInsurerDecision('claim-1', 'clinic-1', {
        targetStatus: ClaimStatus.DENIED,
        externalReference: 'INS-DENY-9',
        providerCode: 'CO-16',
        decidedAt: new Date('2026-10-02T00:00:00.000Z'),
        denialReason: 'Not covered under policy',
        expectedVersion: 3,
      });

      const call = transitionMock.mock.calls[0] as unknown as [
        string,
        string,
        number,
        { externalClaimReference: string },
        {
          source: string;
          externalReference: string;
          providerCode: string;
          decidedAt: Date;
        },
      ];
      expect(call[3].externalClaimReference).toBe('INS-DENY-9');
      expect(call[4].source).toBe(ClaimEventSource.INSURER_RESPONSE);
      expect(call[4].externalReference).toBe('INS-DENY-9');
      expect(call[4].providerCode).toBe('CO-16');
      expect(call[4].decidedAt).toEqual(new Date('2026-10-02T00:00:00.000Z'));
    });

    it('links a settlement to the insurer reference', async () => {
      // SETTLED is only reachable from an approved claim, so the claim under
      // reconciliation is one the insurer already approved.
      findByIdMock.mockResolvedValue(
        buildClaim({
          status: ClaimStatus.APPROVED,
          approvedAmountCents: 100000,
          patientResponsibilityCents: 0,
        }) as never,
      );
      transitionMock.mockResolvedValue(buildClaim() as never);

      await decisionService.recordInsurerDecision('claim-1', 'clinic-1', {
        targetStatus: ClaimStatus.SETTLED,
        externalReference: 'INS-SETTLE-3',
        expectedVersion: 3,
      });

      const call = transitionMock.mock.calls[0] as unknown as [
        string,
        string,
        number,
        unknown,
        { source: string; externalReference: string },
      ];
      expect(call[4].source).toBe(ClaimEventSource.INSURER_RESPONSE);
      expect(call[4].externalReference).toBe('INS-SETTLE-3');
    });

    it('refuses a decision with no insurer reference', async () => {
      await expect(
        decisionService.recordInsurerDecision('claim-1', 'clinic-1', {
          targetStatus: ClaimStatus.DENIED,
          externalReference: '   ',
          denialReason: 'Not covered',
          expectedVersion: 3,
        }),
      ).rejects.toThrow('An external reference is required');

      expect(transitionMock).not.toHaveBeenCalled();
    });

    it('refuses to apply a decision on a stale version', async () => {
      findByIdMock.mockResolvedValue(
        buildClaim({
          status: ClaimStatus.APPROVED,
          approvedAmountCents: 100000,
          patientResponsibilityCents: 0,
        }) as never,
      );
      transitionMock.mockResolvedValue(null);

      await expect(
        decisionService.recordInsurerDecision('claim-1', 'clinic-1', {
          targetStatus: ClaimStatus.SETTLED,
          externalReference: 'INS-SETTLE-4',
          expectedVersion: 2,
        }),
      ).rejects.toThrow('modified by another request');
    });

    it('still enforces that the insurer cannot approve more than was claimed', async () => {
      await expect(
        decisionService.recordInsurerDecision('claim-1', 'clinic-1', {
          targetStatus: ClaimStatus.PARTIALLY_APPROVED,
          externalReference: 'INS-PART-1',
          approvedAmountCents: 999999,
          expectedVersion: 3,
        }),
      ).rejects.toThrow();

      expect(transitionMock).not.toHaveBeenCalled();
    });
  });
});
