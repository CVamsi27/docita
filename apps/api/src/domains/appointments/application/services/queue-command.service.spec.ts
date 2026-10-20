import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { QueueToken } from '@workspace/db';
import { QueueCommandService } from './queue-command.service';
import type {
  AppointmentForCheckIn,
  IQueueRepository,
} from '@/domains/appointments/core/repositories/queue.repository.interface';
import type { AppointmentQueryService } from './appointment-query.service';
import type { IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-07-04T10:15:00.000Z');

const asToken = (partial: Partial<QueueToken>): QueueToken =>
  partial as unknown as QueueToken;

const appointmentForCheckIn: AppointmentForCheckIn = {
  id: 'appt-1',
  patientId: 'patient-1',
  doctorId: 'doctor-1',
  startTime: NOW,
  patient: {
    id: 'patient-1',
    firstName: 'A',
    lastName: 'B',
    phoneNumber: null,
  },
};

function makeCtx() {
  const queueRepository = {
    findAppointmentForCheckIn: jest
      .fn<IQueueRepository['findAppointmentForCheckIn']>()
      .mockResolvedValue(null),
    findExistingToken: jest
      .fn<IQueueRepository['findExistingToken']>()
      .mockResolvedValue(null),
    findLastTodayTokenNumber: jest
      .fn<IQueueRepository['findLastTodayTokenNumber']>()
      .mockResolvedValue(0),
    createToken: jest
      .fn<IQueueRepository['createToken']>()
      .mockResolvedValue(asToken({ id: 'tok-new' })),
    allocateToken: jest
      .fn<IQueueRepository['allocateToken']>()
      .mockResolvedValue(asToken({ id: 'tok-new', tokenNumber: 6 })),
    findTokenByIdAndClinic: jest
      .fn<IQueueRepository['findTokenByIdAndClinic']>()
      .mockResolvedValue(null),
    transitionTokenStatus: jest
      .fn<IQueueRepository['transitionTokenStatus']>()
      .mockResolvedValue(asToken({ id: 'tok-1' })),
    cancelTodayActiveTokens: jest
      .fn<IQueueRepository['cancelTodayActiveTokens']>()
      .mockResolvedValue(undefined),
  };
  const appointmentQueryService = {
    getClinicTimezone: jest.fn(async () => 'Asia/Kolkata'),
  };
  const clock: IClock = { now: () => NOW };

  const service = new QueueCommandService(
    queueRepository as unknown as IQueueRepository,
    clock,
    appointmentQueryService as unknown as AppointmentQueryService,
  );
  return { service, queueRepository };
}

describe('QueueCommandService.checkIn', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('throws NotFound when the appointment does not exist', async () => {
    await expect(ctx.service.checkIn('clinic-1', 'appt-x')).rejects.toThrow(
      NotFoundException,
    );
    expect(ctx.queueRepository.allocateToken).not.toHaveBeenCalled();
  });

  it('is idempotent — returns the existing token without creating another', async () => {
    ctx.queueRepository.findAppointmentForCheckIn.mockResolvedValueOnce(
      appointmentForCheckIn,
    );
    ctx.queueRepository.findExistingToken.mockResolvedValueOnce(
      asToken({ id: 'tok-existing' }),
    );

    const result = await ctx.service.checkIn('clinic-1', 'appt-1');

    expect(result).toEqual({
      success: true,
      token: { id: 'tok-existing' },
    });
    expect(ctx.queueRepository.allocateToken).not.toHaveBeenCalled();
  });

  it('allocates the token atomically instead of reading then writing the number', async () => {
    ctx.queueRepository.findAppointmentForCheckIn.mockResolvedValueOnce(
      appointmentForCheckIn,
    );

    await ctx.service.checkIn('clinic-1', 'appt-1');

    // The read-then-write pair is gone: the number is allocated inside the
    // repository, so parallel check-ins cannot both claim the same number.
    expect(ctx.queueRepository.allocateToken).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        status: 'WAITING',
        tokenType: 'scheduled',
      }),
      expect.any(Date),
    );
    expect(
      ctx.queueRepository.allocateToken.mock.calls[0][0],
    ).not.toHaveProperty('tokenNumber');
    expect(ctx.queueRepository.findLastTodayTokenNumber).not.toHaveBeenCalled();
  });

  it('returns the winning token when a concurrent check-in wins the insert', async () => {
    ctx.queueRepository.findAppointmentForCheckIn.mockResolvedValueOnce(
      appointmentForCheckIn,
    );
    ctx.queueRepository.allocateToken.mockRejectedValueOnce(
      Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
    );
    // The first call is the pre-flight idempotency check (no token yet); the
    // second is the re-read inside the catch, where the winner has landed.
    ctx.queueRepository.findExistingToken
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(asToken({ id: 'tok-winner' }));

    const result = await ctx.service.checkIn('clinic-1', 'appt-1');

    // Idempotent: the loser reuses the token rather than surfacing an error.
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        token: expect.objectContaining({ id: 'tok-winner' }),
      }),
    );
  });

  it('rethrows a non-unique-violation allocation failure', async () => {
    ctx.queueRepository.findAppointmentForCheckIn.mockResolvedValueOnce(
      appointmentForCheckIn,
    );
    ctx.queueRepository.findExistingToken.mockResolvedValueOnce(null);
    ctx.queueRepository.allocateToken.mockRejectedValueOnce(
      new Error('connection terminated'),
    );

    await expect(ctx.service.checkIn('clinic-1', 'appt-1')).rejects.toThrow(
      'connection terminated',
    );
  });
});

describe('QueueCommandService call/complete/reset', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  it('callPatient throws NotFound for an unknown token', async () => {
    await expect(
      ctx.service.callPatient('clinic-1', 'queue-x'),
    ).rejects.toThrow(NotFoundException);
    expect(ctx.queueRepository.transitionTokenStatus).not.toHaveBeenCalled();
  });

  it('callPatient moves the token to IN_PROGRESS and stamps call time', async () => {
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(
      asToken({ id: 'queue-1' }),
    );

    await ctx.service.callPatient('clinic-1', 'queue-1');

    expect(ctx.queueRepository.transitionTokenStatus).toHaveBeenCalledWith(
      'queue-1',
      ['WAITING', 'IN_PROGRESS'],
      { status: 'IN_PROGRESS', calledAt: NOW, consultationStart: NOW },
    );
  });

  it('completePatient marks the token COMPLETED with completion time', async () => {
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(
      asToken({ id: 'queue-1' }),
    );

    await ctx.service.completePatient('clinic-1', 'queue-1');

    expect(ctx.queueRepository.transitionTokenStatus).toHaveBeenCalledWith(
      'queue-1',
      ['WAITING', 'IN_PROGRESS'],
      { status: 'COMPLETED', completedAt: NOW },
    );
  });

  it('callPatient conflicts when the token finished before the call landed', async () => {
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(
      asToken({ id: 'queue-1', status: 'COMPLETED' }),
    );
    ctx.queueRepository.transitionTokenStatus.mockResolvedValueOnce(null);

    await expect(
      ctx.service.callPatient('clinic-1', 'queue-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('callPatient is a no-op on a token that is already IN_PROGRESS', async () => {
    const already = asToken({ id: 'queue-1', status: 'IN_PROGRESS' });
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(already);

    await expect(ctx.service.callPatient('clinic-1', 'queue-1')).resolves.toBe(
      already,
    );
    expect(ctx.queueRepository.transitionTokenStatus).not.toHaveBeenCalled();
  });

  it('completePatient is a no-op on a token that is already COMPLETED', async () => {
    const already = asToken({ id: 'queue-1', status: 'COMPLETED' });
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(already);

    await expect(
      ctx.service.completePatient('clinic-1', 'queue-1'),
    ).resolves.toBe(already);
    expect(ctx.queueRepository.transitionTokenStatus).not.toHaveBeenCalled();
  });

  it('resetQueue cancels today’s active tokens', async () => {
    const result = await ctx.service.resetQueue('clinic-1');

    expect(result).toEqual({ success: true });
    expect(ctx.queueRepository.cancelTodayActiveTokens).toHaveBeenCalledTimes(
      1,
    );
  });
});
