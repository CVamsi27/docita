import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
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
    findTokenByIdAndClinic: jest
      .fn<IQueueRepository['findTokenByIdAndClinic']>()
      .mockResolvedValue(null),
    updateToken: jest
      .fn<IQueueRepository['updateToken']>()
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
    expect(ctx.queueRepository.createToken).not.toHaveBeenCalled();
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
    expect(ctx.queueRepository.createToken).not.toHaveBeenCalled();
  });

  it('issues the next sequential token number for a fresh check-in', async () => {
    ctx.queueRepository.findAppointmentForCheckIn.mockResolvedValueOnce(
      appointmentForCheckIn,
    );
    ctx.queueRepository.findLastTodayTokenNumber.mockResolvedValueOnce(5);

    await ctx.service.checkIn('clinic-1', 'appt-1');

    expect(ctx.queueRepository.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        appointmentId: 'appt-1',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        tokenNumber: 6,
        status: 'WAITING',
        tokenType: 'scheduled',
      }),
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
    expect(ctx.queueRepository.updateToken).not.toHaveBeenCalled();
  });

  it('callPatient moves the token to IN_PROGRESS and stamps call time', async () => {
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(
      asToken({ id: 'queue-1' }),
    );

    await ctx.service.callPatient('clinic-1', 'queue-1');

    expect(ctx.queueRepository.updateToken).toHaveBeenCalledWith('queue-1', {
      status: 'IN_PROGRESS',
      calledAt: NOW,
      consultationStart: NOW,
    });
  });

  it('completePatient marks the token COMPLETED with completion time', async () => {
    ctx.queueRepository.findTokenByIdAndClinic.mockResolvedValueOnce(
      asToken({ id: 'queue-1' }),
    );

    await ctx.service.completePatient('clinic-1', 'queue-1');

    expect(ctx.queueRepository.updateToken).toHaveBeenCalledWith('queue-1', {
      status: 'COMPLETED',
      completedAt: NOW,
    });
  });

  it('resetQueue cancels today’s active tokens', async () => {
    const result = await ctx.service.resetQueue('clinic-1');

    expect(result).toEqual({ success: true });
    expect(ctx.queueRepository.cancelTodayActiveTokens).toHaveBeenCalledTimes(
      1,
    );
  });
});
