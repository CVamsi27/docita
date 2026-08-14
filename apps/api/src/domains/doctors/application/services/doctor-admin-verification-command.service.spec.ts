import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { DoctorAdminVerificationCommandService } from './doctor-admin-verification-command.service';
import type { DoctorPersistencePort } from '@/domains/doctors/application/ports/doctor-persistence.port';
import type { DoctorsQueryService } from './doctors-query.service';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { AuditService } from '@/shared/modules/audit/audit/audit.service';

const NOW = new Date('2026-07-05T09:00:00.000Z');

function makeCtx() {
  const findUnique = jest.fn<(args: unknown) => Promise<unknown>>();
  const update = jest.fn<(args: unknown) => Promise<unknown>>(async () => ({}));
  const persistence = {
    user: { findUnique, update },
  } as unknown as DoctorPersistencePort;
  const findOne = jest.fn<(id: string) => Promise<unknown>>(async () => ({
    id: 'doc-1',
  }));
  const queryService = { findOne } as unknown as DoctorsQueryService;
  const clock: IClock = { now: () => NOW };
  const logAction = jest.fn<(args: unknown) => Promise<void>>(
    async () => undefined,
  );
  const auditService = { logAction } as unknown as AuditService;
  const service = new DoctorAdminVerificationCommandService(
    persistence,
    queryService,
    clock,
    auditService,
  );
  return { service, findUnique, update, findOne, logAction };
}

describe('DoctorAdminVerificationCommandService.adminVerifyDoctor', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('requires a support ticket id before any lookup', async () => {
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1', ''),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.findUnique).not.toHaveBeenCalled();
    expect(ctx.logAction).not.toHaveBeenCalled();
  });

  it('throws NotFound when the doctor does not exist', async () => {
    ctx.findUnique.mockResolvedValueOnce(null);
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1', 'SUP-123'),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.update).not.toHaveBeenCalled();
  });

  it('rejects verifying a non-doctor account', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.RECEPTIONIST,
      clinicId: 'clinic-1',
      registrationNumber: 'MCI-1',
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1', 'SUP-123'),
    ).rejects.toThrow('Only doctor accounts can be verified');
    expect(ctx.logAction).not.toHaveBeenCalled();
  });

  it('requires a registration number before verifying', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.DOCTOR,
      clinicId: 'clinic-1',
      registrationNumber: null,
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1', 'SUP-123'),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.update).not.toHaveBeenCalled();
  });

  it('writes the audit row before marking the doctor VERIFIED', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.DOCTOR,
      clinicId: 'clinic-1',
      registrationNumber: 'MCI-1',
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });

    await ctx.service.adminVerifyDoctor(
      'doc-1',
      'admin-1',
      ' SUP-123 ',
      '  looks good  ',
    );

    expect(ctx.logAction).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      userId: 'admin-1',
      actionType: 'DOCTOR_VERIFICATION_OVERRIDDEN',
      resourceType: 'Doctor',
      resourceId: 'doc-1',
      changes: {
        verificationStatus: {
          before: DoctorVerificationStatus.UNVERIFIED,
          after: DoctorVerificationStatus.VERIFIED,
        },
      },
      metadata: {
        ticketId: 'SUP-123',
        decision: DoctorVerificationStatus.VERIFIED,
        note: 'looks good',
      },
    });
    expect(ctx.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({
        verificationStatus: DoctorVerificationStatus.VERIFIED,
        verificationSource: 'MANUAL_ADMIN',
        verificationReason: 'looks good',
        verifiedByAdminId: 'admin-1',
      }),
    });
    expect(ctx.findOne).toHaveBeenCalledWith('doc-1');
  });

  it('stores a null note when no note is supplied', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.ADMIN_DOCTOR,
      clinicId: 'clinic-1',
      registrationNumber: 'MCI-1',
      verificationStatus: DoctorVerificationStatus.REJECTED,
    });

    await ctx.service.adminVerifyDoctor('doc-1', 'admin-1', 'SUP-123');

    expect(ctx.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({ verificationReason: null }),
    });
    expect(ctx.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { ticketId: 'SUP-123', decision: 'VERIFIED', note: null },
      }),
    );
  });
});

describe('DoctorAdminVerificationCommandService.adminRejectDoctor', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('requires a rejection reason before any lookup', async () => {
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', 'SUP-123', '   '),
    ).rejects.toThrow('A rejection reason is required');
    expect(ctx.findUnique).not.toHaveBeenCalled();
  });

  it('requires a support ticket id before any lookup', async () => {
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', '  ', 'Bad docs'),
    ).rejects.toThrow('A support ticket id is required');
    expect(ctx.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFound when the doctor does not exist', async () => {
    ctx.findUnique.mockResolvedValueOnce(null);
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', 'SUP-123', 'Bad docs'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects rejecting a non-doctor account', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.NURSE,
      clinicId: 'clinic-1',
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', 'SUP-123', 'Bad docs'),
    ).rejects.toThrow(BadRequestException);
  });

  it('writes the audit row before marking the doctor REJECTED', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.DOCTOR,
      clinicId: 'clinic-1',
      verificationStatus: DoctorVerificationStatus.UNVERIFIED,
    });

    await ctx.service.adminRejectDoctor(
      'doc-1',
      'admin-1',
      'SUP-456',
      '  invalid MCI  ',
    );

    expect(ctx.logAction).toHaveBeenCalledWith({
      clinicId: 'clinic-1',
      userId: 'admin-1',
      actionType: 'DOCTOR_VERIFICATION_OVERRIDDEN',
      resourceType: 'Doctor',
      resourceId: 'doc-1',
      changes: {
        verificationStatus: {
          before: DoctorVerificationStatus.UNVERIFIED,
          after: DoctorVerificationStatus.REJECTED,
        },
      },
      metadata: {
        ticketId: 'SUP-456',
        decision: DoctorVerificationStatus.REJECTED,
        reason: 'invalid MCI',
      },
    });
    expect(ctx.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({
        verificationStatus: DoctorVerificationStatus.REJECTED,
        verificationReason: 'invalid MCI',
        verifiedByAdminId: 'admin-1',
      }),
    });
  });
});
