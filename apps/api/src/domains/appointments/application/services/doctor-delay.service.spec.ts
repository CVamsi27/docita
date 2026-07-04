import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DoctorDelayService } from './doctor-delay.service';
import { ApplicationEvents } from '@/shared/common/events/application-events';

function makeCtx() {
  const repo = {
    markDelayAndShiftAppointments:
      jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findById: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    clearDelay: jest.fn<(...a: unknown[]) => Promise<void>>(
      async () => undefined,
    ),
    findActiveByDoctor: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
    findActiveByClinic: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  };
  const eventEmitter = { emit: jest.fn() };
  const service = new DoctorDelayService(repo as never, eventEmitter as never);
  return { service, repo, eventEmitter };
}

const delayRow = {
  id: 'delay-1',
  clinicId: 'c1',
  doctorId: 'doc-1',
  delayMinutes: 30,
  reason: 'Emergency',
  isActive: true,
  markedById: 'u1',
  markedAt: new Date('2026-07-03T10:00:00Z'),
  clearedAt: null,
  clearedById: null,
};

describe('DoctorDelayService', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  const command = {
    clinicId: 'c1',
    doctorId: 'doc-1',
    delayMinutes: 30,
    reason: 'Emergency',
    markedById: 'u1',
  };

  describe('markDelay', () => {
    it('rejects a delay outside 1–480 minutes', async () => {
      await expect(
        ctx.service.markDelay({ ...command, delayMinutes: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        ctx.service.markDelay({ ...command, delayMinutes: 481 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ctx.repo.markDelayAndShiftAppointments).not.toHaveBeenCalled();
    });

    it('shifts affected appointments, emits an event, and returns the affected count', async () => {
      ctx.repo.markDelayAndShiftAppointments.mockResolvedValue({
        delay: delayRow,
        affectedAppointmentIds: ['a1', 'a2', 'a3'],
      });

      const result = await ctx.service.markDelay(command);

      expect(result.affectedAppointmentCount).toBe(3);
      expect(ctx.eventEmitter.emit).toHaveBeenCalledWith(
        ApplicationEvents.DOCTOR_DELAY_MARKED,
        expect.objectContaining({
          delayId: 'delay-1',
          doctorId: 'doc-1',
          delayMinutes: 30,
        }),
      );
    });
  });

  describe('clearDelay', () => {
    it('throws NotFound when the delay is missing or belongs to another clinic', async () => {
      ctx.repo.findById.mockResolvedValueOnce(null);
      await expect(
        ctx.service.clearDelay('delay-1', 'c1', 'u2'),
      ).rejects.toBeInstanceOf(NotFoundException);

      ctx.repo.findById.mockResolvedValueOnce({
        ...delayRow,
        clinicId: 'other',
      });
      await expect(
        ctx.service.clearDelay('delay-1', 'c1', 'u2'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(ctx.repo.clearDelay).not.toHaveBeenCalled();
    });

    it('throws when the delay is already cleared', async () => {
      ctx.repo.findById.mockResolvedValue({ ...delayRow, isActive: false });
      await expect(
        ctx.service.clearDelay('delay-1', 'c1', 'u2'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clears an active delay', async () => {
      ctx.repo.findById.mockResolvedValue(delayRow);
      await ctx.service.clearDelay('delay-1', 'c1', 'u2');
      expect(ctx.repo.clearDelay).toHaveBeenCalledWith('delay-1', 'c1', 'u2');
    });
  });

  it('getActiveDelay returns null when none is active', async () => {
    ctx.repo.findActiveByDoctor.mockResolvedValue(null);
    expect(await ctx.service.getActiveDelay('doc-1', 'c1')).toBeNull();
  });

  it('getActiveDelaysForClinic maps each row with a zero affected count', async () => {
    ctx.repo.findActiveByClinic.mockResolvedValue([delayRow]);
    const result = await ctx.service.getActiveDelaysForClinic('c1');
    expect(result).toHaveLength(1);
    expect(result[0]?.affectedAppointmentCount).toBe(0);
  });
});
