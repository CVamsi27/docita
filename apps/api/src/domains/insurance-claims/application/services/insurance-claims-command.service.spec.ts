import { describe, expect, it, jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InsuranceClaimsCommandService } from './insurance-claims-command.service';
import { ClaimStatusEnum } from '@/domains/insurance-claims/core/value-objects/claim-status.value-object';
import { createFixedClockMock } from '@/test-utils';

function createMocks() {
  const repository = {
    findByIdempotencyKey: jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => null,
    ),
    patientBelongsToClinic: jest.fn<(...args: unknown[]) => Promise<boolean>>(
      async () => true,
    ),
    referencesBelongToPatientClinic: jest.fn<
      (...args: unknown[]) => Promise<boolean>
    >(async () => true),
    create: jest.fn(async (data: unknown) => ({
      id: 'claim-1',
      clinicId: 'clinic-1',
      status: ClaimStatusEnum.DRAFT,
      ...(data as object),
    })),
    findById: jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => null,
    ),
    update: jest.fn(async () => null),
    transition: jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => null,
    ),
    attachDocument: jest.fn<(...args: unknown[]) => Promise<unknown>>(
      async () => null,
    ),
  };
  const claimValidationService = {
    assertClaimReady: jest.fn<(...args: unknown[]) => Promise<undefined>>(
      async () => undefined,
    ),
  };
  const service = new InsuranceClaimsCommandService(
    repository as never,
    claimValidationService as never,
    createFixedClockMock(),
  );
  return { repository, claimValidationService, service };
}

const DRAFT_CLAIM = {
  id: 'claim-1',
  claimType: 'PRE_AUTH' as const,
  status: ClaimStatusEnum.DRAFT,
  claimedAmountCents: 10000,
  approvedAmountCents: null,
  patientResponsibilityCents: null,
  submittedAt: null,
  respondedAt: null,
  settledAt: null,
  patientId: 'patient-1',
  clinicId: 'clinic-1',
};

const CREATE_INPUT = {
  claimType: 'PRE_AUTH' as const,
  insurerName: 'Insurer',
  policyNumber: 'POL-1',
  claimedAmountCents: 10000,
  patientId: 'patient-1',
};

describe('InsuranceClaimsCommandService', () => {
  describe('create', () => {
    it('creates a draft claim with tenant scope', async () => {
      const { repository, service } = createMocks();

      const result = await service.create(CREATE_INPUT, 'clinic-1');

      expect(repository.patientBelongsToClinic).toHaveBeenCalledWith(
        'patient-1',
        'clinic-1',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          claimType: 'PRE_AUTH',
          status: ClaimStatusEnum.DRAFT,
          clinicId: 'clinic-1',
          patientId: 'patient-1',
        }),
      );
      expect(result.status).toBe(ClaimStatusEnum.DRAFT);
    });

    it('returns the existing claim for a duplicate idempotency key', async () => {
      const { repository, service } = createMocks();
      repository.findByIdempotencyKey = jest.fn(async () => ({
        id: 'existing',
      }));

      const result = await service.create(CREATE_INPUT, 'clinic-1', 'key-1');

      expect(result).toEqual({ id: 'existing' });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('throws NotFound when the patient does not belong to the clinic', async () => {
      const { repository, service } = createMocks();
      repository.patientBelongsToClinic = jest.fn(async () => false);

      await expect(service.create(CREATE_INPUT, 'clinic-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('requires an invoice for REIMBURSEMENT claims', async () => {
      const { service } = createMocks();

      await expect(
        service.create(
          { ...CREATE_INPUT, claimType: 'REIMBURSEMENT' as const },
          'clinic-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('rejects edits to non-draft claims', async () => {
      const { repository, service } = createMocks();
      repository.findById = jest.fn(async () => ({
        ...DRAFT_CLAIM,
        status: ClaimStatusEnum.SUBMITTED,
      }));

      await expect(
        service.update('claim-1', 'clinic-1', { version: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a claim parented to itself', async () => {
      const { repository, service } = createMocks();
      repository.findById = jest.fn(async () => DRAFT_CLAIM);

      await expect(
        service.update('claim-1', 'clinic-1', {
          version: 1,
          parentClaimId: 'claim-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws Conflict when the version check fails', async () => {
      const { repository, service } = createMocks();
      repository.findById = jest.fn(async () => DRAFT_CLAIM);

      await expect(
        service.update('claim-1', 'clinic-1', { version: 1 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('transition', () => {
    it('runs the billing claim-readiness gate before submitting', async () => {
      const { claimValidationService, repository, service } = createMocks();
      repository.findById = jest.fn(async () => ({
        ...DRAFT_CLAIM,
        invoiceId: 'invoice-1',
      }));
      repository.transition = jest.fn<(...args: unknown[]) => Promise<unknown>>(
        async () => ({
          ...DRAFT_CLAIM,
          status: ClaimStatusEnum.SUBMITTED,
        }),
      );

      const result = await service.transition('claim-1', 'clinic-1', {
        targetStatus: ClaimStatusEnum.SUBMITTED,
        version: 1,
      });

      expect(claimValidationService.assertClaimReady).toHaveBeenCalledWith(
        'invoice-1',
        'clinic-1',
      );
      expect(repository.transition).toHaveBeenCalledWith(
        'claim-1',
        'clinic-1',
        1,
        expect.objectContaining({ status: ClaimStatusEnum.SUBMITTED }),
        expect.objectContaining({
          fromStatus: ClaimStatusEnum.DRAFT,
          toStatus: ClaimStatusEnum.SUBMITTED,
        }),
      );
      expect(result.status).toBe(ClaimStatusEnum.SUBMITTED);
    });

    it('throws NotFound for a missing claim', async () => {
      const { service } = createMocks();

      await expect(
        service.transition('missing', 'clinic-1', {
          targetStatus: ClaimStatusEnum.SUBMITTED,
          version: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('attachDocument', () => {
    it('throws NotFound when the document does not exist for the claim', async () => {
      const { repository, service } = createMocks();
      repository.findById = jest.fn(async () => DRAFT_CLAIM);
      repository.attachDocument = jest.fn(async () => null);

      await expect(
        service.attachDocument('claim-1', 'clinic-1', 'doc-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('re-attaches the doc and returns the refreshed claim', async () => {
      const { repository, service } = createMocks();
      repository.findById = jest.fn(async () => DRAFT_CLAIM);
      repository.attachDocument = jest.fn<
        (...args: unknown[]) => Promise<unknown>
      >(async () => ({ id: 'doc-1' }));

      const result = await service.attachDocument(
        'claim-1',
        'clinic-1',
        'doc-1',
      );

      expect(repository.attachDocument).toHaveBeenCalledWith(
        'claim-1',
        'clinic-1',
        'patient-1',
        'doc-1',
      );
      expect(result.id).toBe('claim-1');
    });
  });
});
