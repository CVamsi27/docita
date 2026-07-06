import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DoctorVerificationStatus, Role } from '@workspace/db';
import { DoctorAdminVerificationCommandService } from './doctor-admin-verification-command.service';
import type { DoctorPersistencePort } from '@/domains/doctors/application/ports/doctor-persistence.port';
import type { DoctorsQueryService } from './doctors-query.service';
import type { IClock } from '@/shared/common/ports/clock.port';

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
  const service = new DoctorAdminVerificationCommandService(
    persistence,
    queryService,
    clock,
  );
  return { service, findUnique, update, findOne };
}

describe('DoctorAdminVerificationCommandService.adminVerifyDoctor', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound when the doctor does not exist', async () => {
    ctx.findUnique.mockResolvedValueOnce(null);
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1'),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.update).not.toHaveBeenCalled();
  });

  it('rejects verifying a non-doctor account', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.RECEPTIONIST,
      registrationNumber: 'MCI-1',
    });
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1'),
    ).rejects.toThrow('Only doctor accounts can be verified');
  });

  it('requires a registration number before verifying', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.DOCTOR,
      registrationNumber: null,
    });
    await expect(
      ctx.service.adminVerifyDoctor('doc-1', 'admin-1'),
    ).rejects.toThrow(BadRequestException);
    expect(ctx.update).not.toHaveBeenCalled();
  });

  it('marks the doctor VERIFIED with admin attribution and a trimmed note', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.DOCTOR,
      registrationNumber: 'MCI-1',
    });

    await ctx.service.adminVerifyDoctor('doc-1', 'admin-1', '  looks good  ');

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

  it('stores a null reason when no note is supplied', async () => {
    ctx.findUnique.mockResolvedValueOnce({
      id: 'doc-1',
      role: Role.ADMIN_DOCTOR,
      registrationNumber: 'MCI-1',
    });

    await ctx.service.adminVerifyDoctor('doc-1', 'admin-1');

    expect(ctx.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({ verificationReason: null }),
    });
  });
});

describe('DoctorAdminVerificationCommandService.adminRejectDoctor', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('requires a rejection reason before any lookup', async () => {
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', '   '),
    ).rejects.toThrow('A rejection reason is required');
    expect(ctx.findUnique).not.toHaveBeenCalled();
  });

  it('throws NotFound when the doctor does not exist', async () => {
    ctx.findUnique.mockResolvedValueOnce(null);
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', 'Bad docs'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects rejecting a non-doctor account', async () => {
    ctx.findUnique.mockResolvedValueOnce({ id: 'doc-1', role: Role.NURSE });
    await expect(
      ctx.service.adminRejectDoctor('doc-1', 'admin-1', 'Bad docs'),
    ).rejects.toThrow(BadRequestException);
  });

  it('marks the doctor REJECTED with the trimmed reason', async () => {
    ctx.findUnique.mockResolvedValueOnce({ id: 'doc-1', role: Role.DOCTOR });

    await ctx.service.adminRejectDoctor('doc-1', 'admin-1', '  invalid MCI  ');

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
