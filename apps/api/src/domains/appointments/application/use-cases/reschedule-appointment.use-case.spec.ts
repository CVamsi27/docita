import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { RescheduleAppointmentUseCase } from './reschedule-appointment.use-case';

const NOW = new Date('2026-07-03T10:00:00Z');
const future = (h: number) => new Date(NOW.getTime() + h * 3600_000);
const past = (h: number) => new Date(NOW.getTime() - h * 3600_000);

function makeCtx() {
  const writeRepository = {
    update: jest.fn<(...a: unknown[]) => Promise<void>>(async () => undefined),
  };
  const schedulingRules = {
    validateAppointmentOverlap:
      jest.fn<(...a: unknown[]) => Promise<{ hasConflict: boolean }>>(),
  };
  const clock = { now: () => NOW };
  const useCase = new RescheduleAppointmentUseCase(
    writeRepository as never,
    schedulingRules as never,
    clock as never,
  );
  const appointment = {
    id: 'appt-1',
    doctorId: 'doc-1',
    reschedule: jest.fn(),
  };
  return { useCase, writeRepository, schedulingRules, appointment };
}

describe('RescheduleAppointmentUseCase', () => {
  let ctx: ReturnType<typeof makeCtx>;
  beforeEach(() => {
    ctx = makeCtx();
  });

  const run = (startTime: Date, endTime: Date) =>
    ctx.useCase.execute({
      appointment: ctx.appointment as never,
      clinicId: 'c1',
      startTime,
      endTime,
    });

  it('rejects a start time that is not before the end time', async () => {
    await expect(run(future(2), future(2))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(
      ctx.schedulingRules.validateAppointmentOverlap,
    ).not.toHaveBeenCalled();
  });

  it('rejects rescheduling into the past (postpone must be forward)', async () => {
    await expect(run(past(2), past(1))).rejects.toThrow(
      /Cannot reschedule to a past time/,
    );
    expect(ctx.appointment.reschedule).not.toHaveBeenCalled();
    expect(ctx.writeRepository.update).not.toHaveBeenCalled();
  });

  it('rejects when the new slot conflicts with another appointment', async () => {
    ctx.schedulingRules.validateAppointmentOverlap.mockResolvedValue({
      hasConflict: true,
    });
    await expect(run(future(1), future(2))).rejects.toThrow(
      /conflicting appointment/,
    );
    expect(ctx.appointment.reschedule).not.toHaveBeenCalled();
  });

  it('reschedules to a free future slot (excluding itself from the overlap check)', async () => {
    ctx.schedulingRules.validateAppointmentOverlap.mockResolvedValue({
      hasConflict: false,
    });
    await run(future(1), future(2));

    expect(ctx.schedulingRules.validateAppointmentOverlap).toHaveBeenCalledWith(
      'doc-1',
      'c1',
      future(1),
      future(2),
      'appt-1',
    );
    expect(ctx.appointment.reschedule).toHaveBeenCalledWith(
      future(1),
      future(2),
      NOW,
    );
    expect(ctx.writeRepository.update).toHaveBeenCalledWith(ctx.appointment);
  });
});
