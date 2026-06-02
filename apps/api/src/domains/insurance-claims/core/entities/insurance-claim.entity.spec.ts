import { describe, expect, it } from '@jest/globals';
import { ClaimStatus, ClaimType } from '@workspace/db';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';
import { InsuranceClaim, InsuranceClaimProps } from './insurance-claim.entity';

const NOW = new Date('2026-06-01T00:00:00.000Z');

function makeClaim(
  overrides: Partial<InsuranceClaimProps> = {},
): InsuranceClaim {
  return new InsuranceClaim({
    id: 'claim_1',
    claimType: ClaimType.REIMBURSEMENT,
    status: ClaimStatus.DRAFT,
    claimedAmountCents: 100_000,
    approvedAmountCents: null,
    patientResponsibilityCents: null,
    submittedAt: null,
    respondedAt: null,
    settledAt: null,
    ...overrides,
  });
}

describe('InsuranceClaim entity', () => {
  it('rejects a negative claimed amount', () => {
    expect(() => makeClaim({ claimedAmountCents: -1 })).toThrow(
      InvariantViolationError,
    );
  });

  it('stamps submittedAt on DRAFT -> SUBMITTED', () => {
    const result = makeClaim().transitionTo(ClaimStatus.SUBMITTED, {
      now: NOW,
    });
    expect(result.status).toBe(ClaimStatus.SUBMITTED);
    expect(result.submittedAt).toEqual(NOW);
  });

  it('blocks an illegal transition (DRAFT -> SETTLED)', () => {
    expect(() =>
      makeClaim().transitionTo(ClaimStatus.SETTLED, { now: NOW }),
    ).toThrow(InvariantViolationError);
  });

  it('defaults full approval to the claimed amount with zero patient responsibility', () => {
    const result = makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
      ClaimStatus.APPROVED,
      { now: NOW },
    );
    expect(result.approvedAmountCents).toBe(100_000);
    expect(result.patientResponsibilityCents).toBe(0);
    expect(result.respondedAt).toEqual(NOW);
  });

  it('derives patient responsibility on partial approval', () => {
    const result = makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
      ClaimStatus.PARTIALLY_APPROVED,
      { now: NOW, approvedAmountCents: 60_000 },
    );
    expect(result.approvedAmountCents).toBe(60_000);
    expect(result.patientResponsibilityCents).toBe(40_000);
  });

  it('requires an approved amount when partially approving', () => {
    expect(() =>
      makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
        ClaimStatus.PARTIALLY_APPROVED,
        { now: NOW },
      ),
    ).toThrow(InvariantViolationError);
  });

  it('rejects an approved amount above the claimed amount', () => {
    expect(() =>
      makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
        ClaimStatus.APPROVED,
        { now: NOW, approvedAmountCents: 200_000 },
      ),
    ).toThrow(InvariantViolationError);
  });

  it('rejects a partial-approval status when the full amount is approved', () => {
    expect(() =>
      makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
        ClaimStatus.PARTIALLY_APPROVED,
        { now: NOW, approvedAmountCents: 100_000 },
      ),
    ).toThrow(InvariantViolationError);
  });

  it('rejects an inconsistent patient responsibility amount', () => {
    expect(() =>
      makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
        ClaimStatus.PARTIALLY_APPROVED,
        {
          now: NOW,
          approvedAmountCents: 60_000,
          patientResponsibilityCents: 10_000,
        },
      ),
    ).toThrow(InvariantViolationError);
  });

  it('makes the full claim the patient responsibility on denial', () => {
    const result = makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
      ClaimStatus.DENIED,
      { now: NOW, denialReason: 'Policy lapsed' },
    );
    expect(result.approvedAmountCents).toBe(0);
    expect(result.patientResponsibilityCents).toBe(100_000);
    expect(result.denialReason).toBe('Policy lapsed');
  });

  it('requires a denial reason', () => {
    expect(() =>
      makeClaim({ status: ClaimStatus.SUBMITTED }).transitionTo(
        ClaimStatus.DENIED,
        { now: NOW },
      ),
    ).toThrow(InvariantViolationError);
  });
});
